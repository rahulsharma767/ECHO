"use client";
import type { ConnectionStatusInfo, EchoDataSource, HumanDecisionValue, LedgerEntry, SceneState, SceneSummary, TakeRecord, Unsubscribe } from "@/types";

type Listener<T> = (value: T) => void;
const API = process.env.NEXT_PUBLIC_ECHO_API_URL || "http://127.0.0.1:8080";
const POLL_MS = 1500;

function isoNow() { return new Date().toISOString(); }

function mapScene(raw: any): SceneState {
  const takes: TakeRecord[] = (raw?.takes ?? []).map((t: any, i: number) => ({
    event: {
      event_id: t.event_id || `api-${raw.scene_id}-${t.take_number}`,
      scene_id: raw.scene_id,
      take_number: Number(t.take_number),
      character: t.character || "UNKNOWN",
      transcribed_line: t.line || t.transcribed_line || "",
      timestamp: t.timestamp || isoNow(),
      audio_ref: t.audio_ref || `local://sc14/take-${t.take_number}`,
    },
    stageHistory: [
      { stage: "RECEIVED", at: t.timestamp || isoNow() },
      { stage: t.processing_state === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "CLASSIFIED", at: t.timestamp || isoNow() },
    ],
    currentStage: t.processing_state === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "CLASSIFIED",
    classification: t.status ? {
      status: t.status,
      confidence: Number(t.confidence ?? 0),
      diverging_phrase: t.diverging_phrase ?? null,
      conflicts_with_take: t.conflicts_with_take ?? null,
      reason: t.reason ?? null,
    } : null,
    humanDecision: t.human_decision ? {
      decision: t.human_decision,
      decided_at: t.decided_at || t.timestamp || isoNow(),
      decided_by: t.decided_by || "AD (on-set)",
    } : null,
  }));
  takes.sort((a,b) => a.event.take_number - b.event.take_number);
  return {
    scene_id: raw?.scene_id || "",
    reference_lines: (raw?.reference_lines ?? []).map((r: any) => ({
      scene_id: raw.scene_id,
      character: r.character || "UNKNOWN",
      reference_line: r.reference_line || r.line || "",
    })),
    takes,
  };
}

function summarize(scene: SceneState): SceneSummary {
  const pendingDriftCount = scene.takes.filter(t =>
    (t.classification?.status === "DRIFT" || t.currentStage === "NEEDS_REVIEW") && !t.humanDecision
  ).length;
  const lastActivityAt = scene.takes.length ? scene.takes[scene.takes.length - 1].event.timestamp : null;
  return {
    scene_id: scene.scene_id,
    takeCount: scene.takes.length,
    pendingDriftCount,
    lastActivityAt,
    overallStatus: pendingDriftCount ? "AWAITING_AD" : scene.takes.length ? "CLEAR" : "IDLE",
  };
}

export class ApiDataSource implements EchoDataSource {
  private sceneListeners = new Map<string, Set<Listener<SceneState>>>();
  private scenesListeners = new Set<Listener<SceneSummary[]>>();
  private ledgerListeners = new Set<Listener<LedgerEntry[]>>();
  private connectionListeners = new Set<Listener<ConnectionStatusInfo>>();
  private cache = new Map<string, SceneState>();
  private decisions = new Map<string, { decision: HumanDecisionValue; decided_at: string; decided_by: string }>();
  private timers = new Set<ReturnType<typeof setInterval>>();
  private connection: ConnectionStatusInfo = { state: "LIVE", label: "LIVE BACKEND", detail: API, since: isoNow() };

  subscribeConnectionStatus(cb: Listener<ConnectionStatusInfo>): Unsubscribe {
    this.connectionListeners.add(cb); cb(this.connection); this.refreshConnection();
    return () => this.connectionListeners.delete(cb);
  }

  subscribeScenes(cb: Listener<SceneSummary[]>): Unsubscribe {
    this.scenesListeners.add(cb);
    const emit = async () => {
      try {
        const raw = await this.getJson("/api/scenes");
        const scenes = (raw?.scenes ?? []).map(mapScene);
        scenes.forEach(s => this.cache.set(s.scene_id, this.mergeDecisions(s)));
        cb(scenes.map(summarize)); this.setLive();
      } catch { this.setDisconnected(); }
    };
    void emit();
    const timer = setInterval(emit, POLL_MS); this.timers.add(timer);
    return () => { this.scenesListeners.delete(cb); clearInterval(timer); this.timers.delete(timer); };
  }

  subscribeSceneTakes(sceneId: string, cb: Listener<SceneState>): Unsubscribe {
    if (!this.sceneListeners.has(sceneId)) this.sceneListeners.set(sceneId, new Set());
    this.sceneListeners.get(sceneId)!.add(cb);
    const emit = async () => {
      try {
        const raw = await this.getJson(`/api/scenes/${encodeURIComponent(sceneId)}`);
        const scene = this.mergeDecisions(mapScene(raw));
        this.cache.set(sceneId, scene); cb(scene); this.setLive(); this.emitLedger();
      } catch { this.setDisconnected(); }
    };
    void emit();
    const timer = setInterval(emit, POLL_MS); this.timers.add(timer);
    return () => { this.sceneListeners.get(sceneId)?.delete(cb); clearInterval(timer); this.timers.delete(timer); };
  }

  subscribeLedger(cb: Listener<LedgerEntry[]>): Unsubscribe {
    this.ledgerListeners.add(cb); void this.refreshLedger();
    const timer = setInterval(() => void this.refreshLedger(), POLL_MS); this.timers.add(timer);
    return () => { this.ledgerListeners.delete(cb); clearInterval(timer); this.timers.delete(timer); };
  }

  async submitHumanDecision(sceneId: string, takeNumber: number, decision: HumanDecisionValue): Promise<void> {
    const response = await fetch(`${API}/api/scenes/${encodeURIComponent(sceneId)}/takes/${takeNumber}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, decided_by: "AD (on-set)" }),
    });
    if (!response.ok) throw new Error(`ECHO API ${response.status}`);
    const key = `${sceneId}:${takeNumber}`;
    this.decisions.set(key, { decision, decided_at: isoNow(), decided_by: "AD (on-set)" });
    const scene = this.cache.get(sceneId);
    if (scene) {
      const take = scene.takes.find(t => t.event.take_number === takeNumber);
      if (take) take.humanDecision = this.decisions.get(key)!;
      this.cache.set(sceneId, scene); this.emitScene(scene); this.emitLedger();
    }
  }

  private async refreshLedger() {
    try {
      const raw = await this.getJson("/api/scenes");
      const scenes = (raw?.scenes ?? []).map(mapScene).map((s: SceneState) => this.mergeDecisions(s));
      scenes.forEach(s => this.cache.set(s.scene_id, s));
      this.emitLedger(); this.setLive();
    } catch { this.setDisconnected(); }
  }

  private async getJson(path: string) {
    const response = await fetch(`${API}${path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`ECHO API ${response.status}`);
    return response.json();
  }
  private mergeDecisions(scene: SceneState): SceneState {
    return { ...scene, takes: scene.takes.map(t => ({ ...t, humanDecision: this.decisions.get(`${scene.scene_id}:${t.event.take_number}`) ?? t.humanDecision })) };
  }
  private emitScene(scene: SceneState) { this.sceneListeners.get(scene.scene_id)?.forEach(cb => cb({ ...scene, takes: scene.takes.map(t => ({ ...t })) })); }
  private emitLedger() {
    const entries: LedgerEntry[] = [];
    this.cache.forEach(scene => scene.takes.forEach(t => {
      if (!t.classification) return;
      entries.push({ scene_id: scene.scene_id, take_number: t.event.take_number, character: t.event.character, line: t.event.transcribed_line, status: t.classification.status, confidence: t.classification.confidence, diverging_phrase: t.classification.diverging_phrase, conflicts_with_take: t.classification.conflicts_with_take, reason: t.classification.reason, human_decision: t.humanDecision?.decision ?? null, timestamp: t.event.timestamp });
    }));
    entries.sort((a,b) => a.scene_id.localeCompare(b.scene_id) || a.take_number-b.take_number);
    this.ledgerListeners.forEach(cb => cb(entries));
  }
  private setLive() { if (this.connection.state !== "LIVE") { this.connection = { state: "LIVE", label: "LIVE BACKEND", detail: API, since: isoNow() }; this.connectionListeners.forEach(cb => cb(this.connection)); } }
  private setDisconnected() { if (this.connection.state !== "DISCONNECTED") { this.connection = { state: "DISCONNECTED", label: "BACKEND OFFLINE", detail: `Cannot reach ${API}`, since: isoNow() }; this.connectionListeners.forEach(cb => cb(this.connection)); } }
  private refreshConnection() { void fetch(`${API}/health`, { cache: "no-store" }).then(r => r.ok ? this.setLive() : this.setDisconnected()).catch(() => this.setDisconnected()); }
}
export const apiDataSource = new ApiDataSource();

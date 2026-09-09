import type {
  ClassificationResult,
  ConnectionStatusInfo,
  EchoDataSource,
  HumanDecisionValue,
  LedgerEntry,
  ProcessingStage,
  SceneState,
  SceneSummary,
  StageEvent,
  TakeEvent,
  TakeRecord,
  Unsubscribe,
} from "@/types";

type Listener<T> = (val: T) => void;

function nowIso() {
  return new Date().toISOString();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Deterministic classification lookup for the demo script (Section 5 & 9). */
const DEMO_CLASSIFICATIONS: Record<number, ClassificationResult> = {
  1: {
    status: "MATCH",
    confidence: 0.98,
    diverging_phrase: null,
    conflicts_with_take: null,
    reason: null,
  },
  2: {
    status: "ACCEPTABLE_ADLIB",
    confidence: 0.87,
    diverging_phrase: null,
    conflicts_with_take: null,
    reason:
      "Wording differs but meaning and rhythm stay close enough to the reference line to cut cleanly.",
  },
  3: {
    status: "DRIFT",
    confidence: 0.91,
    diverging_phrase: "really",
    conflicts_with_take: 1,
    reason: "Adds emphasis not present in Take 1 — will not intercut cleanly on this beat.",
  },
  // bonus scenario demonstrating the low-confidence → NEEDS_REVIEW routing
  // from Section 2's failure/retry rules
  4: {
    status: "DRIFT",
    confidence: 0.68,
    diverging_phrase: "not really",
    conflicts_with_take: 1,
    reason: "Meaning may still hold, but confidence is below threshold — routed for review.",
  },
};

const DEMO_LINES: Record<number, string> = {
  1: "I never trusted him.",
  2: "I didn't trust him.",
  3: "I never really trusted him.",
  4: "I never actually trusted him, not really.",
};

const HERO_SCENE_ID = "SC14";
const HERO_CHARACTER = "MARCUS";
const HERO_REFERENCE = "I never trusted him.";

function makeEvent(takeNumber: number, idCounter: number): TakeEvent {
  return {
    event_id: `evt_${String(idCounter).padStart(5, "0")}`,
    scene_id: HERO_SCENE_ID,
    take_number: takeNumber,
    character: HERO_CHARACTER,
    transcribed_line: DEMO_LINES[takeNumber] ?? "",
    timestamp: nowIso(),
    audio_ref: `gs://echo-demo-audio/sc14_take${takeNumber}.wav`,
  };
}

function stage(s: ProcessingStage): StageEvent {
  return { stage: s, at: nowIso() };
}

function summarize(scene: SceneState): SceneSummary {
  const takeCount = scene.takes.length;
  const pendingDriftCount = scene.takes.filter(
    (t) =>
      (t.classification?.status === "DRIFT" || t.currentStage === "NEEDS_REVIEW") &&
      !t.humanDecision
  ).length;
  const lastActivityAt =
    scene.takes.length > 0 ? scene.takes[scene.takes.length - 1].event.timestamp : null;

  const isProcessing = scene.takes.some(
    (t) => t.currentStage !== "CLASSIFIED" && t.currentStage !== "NEEDS_REVIEW"
  );

  let overallStatus: SceneSummary["overallStatus"] = "IDLE";
  if (takeCount === 0) overallStatus = "IDLE";
  else if (pendingDriftCount > 0) overallStatus = "AWAITING_AD";
  else if (isProcessing) overallStatus = "LIVE";
  else overallStatus = "CLEAR";

  return { scene_id: scene.scene_id, takeCount, pendingDriftCount, lastActivityAt, overallStatus };
}

class DemoEngine implements EchoDataSource {
  private idCounter = 100;
  private connectionListeners = new Set<Listener<ConnectionStatusInfo>>();
  private sceneListListeners = new Set<Listener<SceneSummary[]>>();
  private sceneTakeListeners = new Map<string, Set<Listener<SceneState>>>();
  private ledgerListeners = new Set<Listener<LedgerEntry[]>>();

  private connection: ConnectionStatusInfo = {
    state: "DEMO",
    label: "DEMO STREAM",
    detail: "simulated takes.transcripts feed",
    since: nowIso(),
  };

  private scenes = new Map<string, SceneState>([
    [
      HERO_SCENE_ID,
      {
        scene_id: HERO_SCENE_ID,
        reference_lines: [
          { scene_id: HERO_SCENE_ID, character: HERO_CHARACTER, reference_line: HERO_REFERENCE },
        ],
        takes: [],
      },
    ],
    [
      "SC08",
      {
        scene_id: "SC08",
        reference_lines: [
          { scene_id: "SC08", character: "ELENA", reference_line: "We leave at dawn." },
        ],
        takes: [
          {
            event: {
              event_id: "evt_00001",
              scene_id: "SC08",
              take_number: 1,
              character: "ELENA",
              transcribed_line: "We leave at dawn.",
              timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
              audio_ref: "gs://echo-demo-audio/sc08_take1.wav",
            },
            stageHistory: [stage("RECEIVED"), stage("CLASSIFIED")],
            currentStage: "CLASSIFIED",
            classification: {
              status: "MATCH",
              confidence: 0.99,
              diverging_phrase: null,
              conflicts_with_take: null,
              reason: null,
            },
            humanDecision: null,
          },
          {
            event: {
              event_id: "evt_00002",
              scene_id: "SC08",
              take_number: 2,
              character: "ELENA",
              transcribed_line: "We leave at dawn.",
              timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
              audio_ref: "gs://echo-demo-audio/sc08_take2.wav",
            },
            stageHistory: [stage("RECEIVED"), stage("CLASSIFIED")],
            currentStage: "CLASSIFIED",
            classification: {
              status: "MATCH",
              confidence: 0.97,
              diverging_phrase: null,
              conflicts_with_take: null,
              reason: null,
            },
            humanDecision: null,
          },
        ],
      },
    ],
    [
      "SC22",
      {
        scene_id: "SC22",
        reference_lines: [
          { scene_id: "SC22", character: "DANIEL", reference_line: "Nobody saw it coming." },
        ],
        takes: [],
      },
    ],
  ]);

  private ledger: LedgerEntry[] = [];

  private autoRunning = false;

  // ---- EchoDataSource ----------------------------------------------

  subscribeConnectionStatus(cb: Listener<ConnectionStatusInfo>): Unsubscribe {
    this.connectionListeners.add(cb);
    cb(this.connection);
    return () => this.connectionListeners.delete(cb);
  }

  subscribeScenes(cb: Listener<SceneSummary[]>): Unsubscribe {
    this.sceneListListeners.add(cb);
    cb(this.computeSceneSummaries());
    return () => this.sceneListListeners.delete(cb);
  }

  subscribeSceneTakes(sceneId: string, cb: Listener<SceneState>): Unsubscribe {
    if (!this.sceneTakeListeners.has(sceneId)) this.sceneTakeListeners.set(sceneId, new Set());
    const set = this.sceneTakeListeners.get(sceneId)!;
    set.add(cb);
    const scene = this.scenes.get(sceneId) ?? {
      scene_id: sceneId,
      reference_lines: [],
      takes: [],
    };
    cb(scene);
    return () => set.delete(cb);
  }

  subscribeLedger(cb: Listener<LedgerEntry[]>): Unsubscribe {
    this.ledgerListeners.add(cb);
    cb(this.computeLedger());
    return () => this.ledgerListeners.delete(cb);
  }

  async submitHumanDecision(
    sceneId: string,
    takeNumber: number,
    decision: HumanDecisionValue
  ): Promise<void> {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    const take = scene.takes.find((t) => t.event.take_number === takeNumber);
    if (!take) return;
    take.humanDecision = { decision, decided_at: nowIso(), decided_by: "AD (on-set)" };
    this.notifySceneTakes(sceneId);
    this.notifySceneList();
    this.notifyLedger();
  }

  // ---- Demo-only control surface (used by DemoControls only) --------

  isAutoRunning() {
    return this.autoRunning;
  }

  /** Trigger a single take through the full pipeline. */
  async triggerTake(takeNumber: 1 | 2 | 3 | 4): Promise<void> {
    const scene = this.scenes.get(HERO_SCENE_ID)!;
    if (scene.takes.some((t) => t.event.take_number === takeNumber)) return; // already fired

    this.idCounter += 1;
    const event = makeEvent(takeNumber, this.idCounter);
    const record: TakeRecord = {
      event,
      stageHistory: [stage("RECEIVED")],
      currentStage: "RECEIVED",
      classification: null,
      humanDecision: null,
    };
    scene.takes.push(record);
    scene.takes.sort((a, b) => a.event.take_number - b.event.take_number);
    this.notifySceneTakes(HERO_SCENE_ID);
    this.notifySceneList();

    const advance = (s: ProcessingStage) => {
      record.currentStage = s;
      record.stageHistory.push(stage(s));
      this.notifySceneTakes(HERO_SCENE_ID);
      this.notifySceneList();
    };

    await delay(550);
    advance("EXTRACTING");
    await delay(650);
    advance("COMPARING_SCRIPT");
    await delay(650);
    advance("COMPARING_PRIOR");
    await delay(650);
    advance("CLASSIFYING");
    await delay(600);

    const result = DEMO_CLASSIFICATIONS[takeNumber];
    record.classification = result;
    record.currentStage = result.confidence < 0.75 ? "NEEDS_REVIEW" : "CLASSIFIED";
    record.stageHistory.push(stage(record.currentStage));
    this.notifySceneTakes(HERO_SCENE_ID);
    this.notifySceneList();
    this.notifyLedger();
  }

  async triggerUploadedTake(transcript: string, fileName: string): Promise<void> {
    const scene = this.scenes.get(HERO_SCENE_ID)!;
    const next = ([1, 2, 3, 4] as const).find((n) => !scene.takes.some((t) => t.event.take_number === n));
    if (!next) return;

    this.idCounter += 1;
    const event: TakeEvent = {
      event_id: `evt_${String(this.idCounter).padStart(5, "0")}`,
      scene_id: HERO_SCENE_ID,
      take_number: next,
      character: HERO_CHARACTER,
      transcribed_line: transcript,
      timestamp: nowIso(),
      audio_ref: `local-video://${encodeURIComponent(fileName)}`,
    };
    const record: TakeRecord = {
      event,
      stageHistory: [stage("RECEIVED")],
      currentStage: "RECEIVED",
      classification: null,
      humanDecision: null,
    };
    scene.takes.push(record);
    scene.takes.sort((a, b) => a.event.take_number - b.event.take_number);
    this.notifySceneTakes(HERO_SCENE_ID);
    this.notifySceneList();

    const advance = async (s: ProcessingStage, ms: number) => {
      await delay(ms);
      record.currentStage = s;
      record.stageHistory.push(stage(s));
      this.notifySceneTakes(HERO_SCENE_ID);
      this.notifySceneList();
    };

    await advance("EXTRACTING", 450);
    await advance("COMPARING_SCRIPT", 550);
    await advance("COMPARING_PRIOR", 550);
    await advance("CLASSIFYING", 550);

    let result: ClassificationResult;
    if (transcript.trim().toLowerCase() === HERO_REFERENCE.toLowerCase()) {
      result = DEMO_CLASSIFICATIONS[1];
    } else if (transcript.trim().toLowerCase() === DEMO_LINES[1].toLowerCase()) {
      result = DEMO_CLASSIFICATIONS[2];
    } else if (transcript.toLowerCase().includes("really")) {
      result = DEMO_CLASSIFICATIONS[3];
    } else {
      result = {
        status: "DRIFT",
        confidence: 0.79,
        diverging_phrase: transcript.trim().split(/\s+/).find((word) => !HERO_REFERENCE.toLowerCase().includes(word.toLowerCase().replace(/[^a-z']/g, ""))) ?? null,
        conflicts_with_take: 1,
        reason: "Wording differs from the reference line — review before intercutting.",
      };
    }

    record.classification = result;
    record.currentStage = result.confidence < 0.75 ? "NEEDS_REVIEW" : "CLASSIFIED";
    record.stageHistory.push(stage(record.currentStage));
    this.notifySceneTakes(HERO_SCENE_ID);
    this.notifySceneList();
    this.notifyLedger();
  }

  async runAutoDemo(): Promise<void> {
    if (this.autoRunning) return;
    this.autoRunning = true;
    for (const n of [1, 2, 3] as const) {
      if (!this.scenes.get(HERO_SCENE_ID)!.takes.some((t) => t.event.take_number === n)) {
        await this.triggerTake(n);
      }
      await delay(500);
    }
    this.autoRunning = false;
  }

  reset(): void {
    const scene = this.scenes.get(HERO_SCENE_ID)!;
    scene.takes = [];
    this.autoRunning = false;
    this.notifySceneTakes(HERO_SCENE_ID);
    this.notifySceneList();
    this.notifyLedger();
  }

  // ---- internal ------------------------------------------------------

  private computeSceneSummaries(): SceneSummary[] {
    return Array.from(this.scenes.values()).map(summarize);
  }

  private computeLedger(): LedgerEntry[] {
    const entries: LedgerEntry[] = [];
    for (const scene of this.scenes.values()) {
      for (const t of scene.takes) {
        if (!t.classification) continue;
        entries.push({
          scene_id: scene.scene_id,
          take_number: t.event.take_number,
          character: t.event.character,
          line: t.event.transcribed_line,
          status: t.classification.status,
          confidence: t.classification.confidence,
          diverging_phrase: t.classification.diverging_phrase,
          conflicts_with_take: t.classification.conflicts_with_take,
          reason: t.classification.reason,
          human_decision: t.humanDecision?.decision ?? null,
          timestamp: t.event.timestamp,
        });
      }
    }
    entries.sort((a, b) => a.scene_id.localeCompare(b.scene_id) || a.take_number - b.take_number);
    return entries;
  }

  private notifySceneTakes(sceneId: string) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    const listeners = this.sceneTakeListeners.get(sceneId);
    if (!listeners) return;
    const snapshot: SceneState = {
      scene_id: scene.scene_id,
      reference_lines: scene.reference_lines,
      takes: scene.takes.map((t) => ({ ...t })),
    };
    listeners.forEach((cb) => cb(snapshot));
  }

  private notifySceneList() {
    const summaries = this.computeSceneSummaries();
    this.sceneListListeners.forEach((cb) => cb(summaries));
  }

  private notifyLedger() {
    const entries = this.computeLedger();
    this.ledgerListeners.forEach((cb) => cb(entries));
  }
}

/** Singleton — imported by the app root (as the active EchoDataSource)
 * and by DemoControls (for its trigger/reset buttons). No other
 * component should import this directly. */
export const demoEngine = new DemoEngine();

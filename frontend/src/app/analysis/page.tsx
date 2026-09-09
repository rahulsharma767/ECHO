"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileVideo, LoaderCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { useSceneTakes } from "@/hooks/useSceneTakes";
import { demoEngine } from "@/lib/demoEngine";
import { ComparisonView } from "@/components/comparison/ComparisonView";
import { useSubmitDecision } from "@/hooks/useSubmitDecision";

export default function AnalysisPage() {
  const router = useRouter();
  const scene = useSceneTakes("SC14");
  const [pending, setPending] = useState<{fileName:string;fileSize:number;transcript:string}|null>(null);
  const [takeNumber, setTakeNumber] = useState<number|null>(null);
  const [open, setOpen] = useState(false);
  const { submit, submitting } = useSubmitDecision();

  useEffect(() => {
    const raw = sessionStorage.getItem("echo_pending_take");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setPending({fileName:data.fileName,fileSize:data.fileSize,transcript:data.transcript});
      sessionStorage.removeItem("echo_pending_take");
      void demoEngine.triggerUploadedTake(data.transcript, data.fileName).then(() => setTakeNumber(null));
    } catch { /* ignore malformed demo payload */ }
  }, []);

  useEffect(() => {
    if (!pending) return;
    const match = [...scene.takes].reverse().find(t => t.event.transcribed_line === pending.transcript);
    if (match) {
      setTakeNumber(match.event.take_number);
      if (match.classification?.status === "DRIFT" && !match.humanDecision) setOpen(true);
    }
  }, [scene.takes, pending]);

  const take = takeNumber ? scene.takes.find(t => t.event.take_number === takeNumber) ?? null : null;
  const prior = useMemo(() => take?.classification?.conflicts_with_take ? scene.takes.find(t => t.event.take_number === take.classification!.conflicts_with_take) ?? null : null, [take, scene.takes]);
  const reference = scene.reference_lines[0]?.reference_line ?? "I never trusted him.";
  const processing = Boolean(pending && !take?.classification);

  return <>
    <TopBar eyebrow="Production / Analysis" title="Take analysis" />
    <main className="flex-1 overflow-y-auto p-5 md:p-7">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-signal-live">ECHO analysis engine</div><h2 className="mt-2 text-3xl font-medium tracking-tight">Dialogue continuity analysis</h2><p className="mt-2 text-sm text-text-muted">Comparing the uploaded take against the script reference and prior takes.</p></div>
          <button onClick={()=>router.push("/video-upload")} className="flex items-center gap-2 rounded border border-line-strong px-3 py-2 text-[11px] text-text-muted hover:bg-raised hover:text-text-primary"><ArrowLeft className="h-3.5 w-3.5"/> Upload another take</button>
        </div>

        {pending && <div className="mb-4 rounded-md border border-line bg-panel p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded border border-line bg-void p-2"><FileVideo className="h-4 w-4 text-signal-live"/></div><div><div className="text-[13px] font-medium">{pending.fileName}</div><div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-text-faint">{(pending.fileSize/1024/1024).toFixed(1)} MB · SC14 · MARCUS</div></div></div>{processing && <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-signal-live"><LoaderCircle className="h-3.5 w-3.5 animate-spin"/> ECHO processing</div>}</div></div>}

        <div className="grid gap-4 md:grid-cols-3">
          {[["01","Script reference",reference], ["02","Uploaded transcript",pending?.transcript ?? "Waiting for upload…"], ["03","Prior take",prior?.event.transcribed_line ?? "Comparing prior takes…"]].map(([n,label,value])=><div key={n} className="rounded-md border border-line bg-panel p-4"><div className="font-mono text-[9px] uppercase tracking-widest text-text-faint">{n} / {label}</div><div className="mt-3 text-[13px] leading-5">“{value}”</div></div>)}
        </div>

        <div className="mt-4 rounded-md border border-line bg-panel p-5">
          <div className="font-mono text-[9px] uppercase tracking-[.18em] text-text-faint">Pipeline status</div>
          <div className="mt-4 space-y-2">{["RECEIVED","EXTRACTING","COMPARING_SCRIPT","COMPARING_PRIOR","CLASSIFYING"].map((stage,i)=>{const done=take && take.stageHistory.some(s=>s.stage===stage);return <div key={stage} className="flex items-center gap-3 rounded border border-line bg-void px-3 py-2.5"><div className={`h-2 w-2 rounded-full ${done?"bg-signal-match":"bg-text-faint"}`}/><span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{stage.replaceAll("_"," ")}</span>{done&&<CheckCircle2 className="ml-auto h-3.5 w-3.5 text-signal-match"/>}</div>})}</div>
        </div>

        {take?.classification && <div className="mt-4 rounded-md border border-line bg-panel p-5"><div className="flex items-center justify-between"><div className="font-mono text-[9px] uppercase tracking-[.18em] text-text-faint">Classification result</div><span className={`rounded px-2 py-1 font-mono text-[10px] ${take.classification.status==="DRIFT"?"bg-signal-drift-dim text-signal-drift":take.classification.status==="ACCEPTABLE_ADLIB"?"bg-signal-pending-dim text-signal-pending":"bg-signal-match-dim text-signal-match"}`}>{take.classification.status}</span></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div><div className="font-mono text-[9px] text-text-faint">CONFIDENCE</div><div className="mt-1 text-xl">{Math.round(take.classification.confidence*100)}%</div></div><div className="md:col-span-2"><div className="font-mono text-[9px] text-text-faint">REASON</div><div className="mt-1 text-[12px] leading-5 text-text-muted">{take.classification.reason ?? "No continuity issue detected."}</div></div></div>{take.classification.status === "DRIFT" && <button onClick={()=>setOpen(true)} className="mt-4 flex items-center gap-2 rounded border border-signal-drift/30 px-3 py-2 text-[11px] text-signal-drift hover:bg-signal-drift/10"><ShieldAlert className="h-3.5 w-3.5"/> Review continuity decision</button>}</div>}

        {take?.classification && <ComparisonView open={open} onClose={()=>setOpen(false)} sceneId="SC14" referenceLine={reference} priorTake={prior?{take_number:prior.event.take_number,line:prior.event.transcribed_line,character:prior.event.character}:null} currentTake={{take_number:take.event.take_number,line:take.event.transcribed_line,character:take.event.character}} result={take.classification} decision={take.humanDecision} submitting={submitting} onDecide={d=>submit("SC14",take.event.take_number,d)} />}
      </div>
    </main>
  </>;
}

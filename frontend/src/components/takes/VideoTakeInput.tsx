"use client";

import { useEffect, useState } from "react";
import { Film, Upload, X, Send, Mic2 } from "lucide-react";
import { demoEngine } from "@/lib/demoEngine";
import { useSceneTakes } from "@/hooks/useSceneTakes";

const DEMO_LINES = [
  "I never trusted him.",
  "I didn't trust him.",
  "I never really trusted him.",
  "I never actually trusted him, not really.",
];

export function VideoTakeInput({ sceneId }: { sceneId: string }) {
  const scene = useSceneTakes(sceneId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const nextTake = Math.min(4, scene.takes.length + 1) as 1 | 2 | 3 | 4;
  const allDemoTaken = scene.takes.length >= 4;

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (selected: File | null) => {
    if (!selected) return;
    if (!selected.type.startsWith("video/") && !selected.type.startsWith("audio/")) {
      setMessage("Please choose a video or audio file.");
      return;
    }
    setFile(selected);
    setMessage("");
    if (!transcript) setTranscript(DEMO_LINES[nextTake - 1] ?? "");
  };

  const processTake = async () => {
    if (!file || !transcript.trim() || allDemoTaken || processing) return;
    setProcessing(true);
    setMessage("Sending take to the ECHO pipeline…");
    await demoEngine.triggerUploadedTake(transcript.trim(), file.name);
    setMessage("Take received. ECHO is processing the transcript.");
    setProcessing(false);
    setFile(null);
    setTranscript("");
  };

  return (
    <section className="mb-5 rounded-md border border-line bg-panel p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-signal-live">
            <Film className="h-3.5 w-3.5" />
            Live take input
          </div>
          <h2 className="mt-1 text-[15px] font-medium text-text-primary">Send a video take to ECHO</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-text-muted">
            Upload a recorded take, confirm its transcript, then send it through the same demo pipeline used by the live stream.
          </p>
        </div>
        <div className="rounded border border-line-strong bg-raised px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-text-faint">
          Next take · {allDemoTaken ? "complete" : `0${nextTake}`}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <label className="group flex min-h-[145px] cursor-pointer flex-col items-center justify-center rounded border border-dashed border-line-strong bg-void px-5 py-6 text-center transition-colors hover:border-signal-live/60 hover:bg-raised">
          <input
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <Film className="h-7 w-7 text-signal-live" />
              <div className="mt-2 max-w-full truncate text-[13px] text-text-primary">{file.name}</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-text-faint">
                {(file.size / 1024 / 1024).toFixed(1)} MB · click to replace
              </div>
            </>
          ) : (
            <>
              <Upload className="h-7 w-7 text-text-muted transition-colors group-hover:text-signal-live" />
              <div className="mt-2 text-[13px] text-text-primary">Drop video / audio here</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-text-faint">or click to browse · MP4 / MOV / WEBM / WAV / MP3</div>
            </>
          )}
        </label>

        <div className="rounded border border-line bg-void p-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-text-faint">
            <Mic2 className="h-3.5 w-3.5" />
            Transcript sent to ECHO
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Confirm or paste the spoken dialogue…"
            className="h-[78px] w-full resize-none rounded border border-line-strong bg-panel px-3 py-2 text-[12px] leading-5 text-text-primary outline-none placeholder:text-text-faint focus:border-signal-live/60"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[9px] leading-4 text-text-faint">Local demo: transcript confirmation stands in for speech-to-text.</span>
            <button
              disabled={!file || !transcript.trim() || allDemoTaken || processing}
              onClick={processTake}
              className="flex shrink-0 items-center gap-1.5 rounded bg-signal-live px-3 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Send className="h-3.5 w-3.5" />
              {processing ? "Processing…" : "Send take"}
            </button>
          </div>
        </div>
      </div>

      {preview && file?.type.startsWith("video/") && (
        <div className="mt-3 overflow-hidden rounded border border-line bg-black">
          <video src={preview} controls className="max-h-[280px] w-full" />
        </div>
      )}

      {message && <div className="mt-3 font-mono text-[9px] uppercase tracking-wider text-signal-live">{message}</div>}
      {file && (
        <button
          onClick={() => { setFile(null); setTranscript(""); setMessage(""); }}
          className="mt-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-text-faint hover:text-text-primary"
        >
          <X className="h-3 w-3" /> Clear upload
        </button>
      )}
    </section>
  );
}

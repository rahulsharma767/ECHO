"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Play, RotateCcw, TestTube2 } from "lucide-react";
import { demoEngine } from "@/lib/demoEngine";
import { useSceneTakes } from "@/hooks/useSceneTakes";

const HERO_SCENE_ID = "SC14";

const TAKE_BUTTONS: { n: 1 | 2 | 3 | 4; label: string; hint: string }[] = [
  { n: 1, label: "Take 1", hint: "control · match" },
  { n: 2, label: "Take 2", hint: "ad-lib" },
  { n: 3, label: "Take 3", hint: "hero · drift" },
  { n: 4, label: "Take 4", hint: "bonus · low-confidence" },
];

export function DemoControls() {
  const scene = useSceneTakes(HERO_SCENE_ID);
  const [autoRunning, setAutoRunning] = useState(false);
  const fired = new Set(scene.takes.map((t) => t.event.take_number));

  return (
    <div className="rounded-md border border-signal-adlib/30 bg-signal-adlib-dim/20 p-3.5">
      <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-signal-adlib">
        <TestTube2 className="h-3.5 w-3.5" />
        Demo stream — simulated, not live Confluent
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TAKE_BUTTONS.map(({ n, label, hint }) => (
          <button
            key={n}
            disabled={fired.has(n) || autoRunning}
            onClick={() => demoEngine.triggerTake(n)}
            className="group relative rounded border border-line-strong bg-panel px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:border-signal-adlib/60 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            {label}
            <span className="ml-1.5 font-mono text-[9px] text-text-faint">{hint}</span>
          </button>
        ))}

        <div className="mx-1 h-4 w-px bg-line-strong" />

        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={autoRunning}
          onClick={async () => {
            setAutoRunning(true);
            await demoEngine.runAutoDemo();
            setAutoRunning(false);
          }}
          className="flex items-center gap-1.5 rounded bg-signal-adlib px-3 py-1.5 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {autoRunning ? "Running…" : "Run full demo (1→2→3)"}
        </motion.button>

        <button
          onClick={() => demoEngine.reset()}
          className="flex items-center gap-1.5 rounded border border-line-strong px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-raised hover:text-text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset scene
        </button>
      </div>
    </div>
  );
}

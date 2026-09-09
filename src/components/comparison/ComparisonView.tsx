"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, GitCompare } from "lucide-react";
import type { ClassificationResult, HumanDecision, HumanDecisionValue } from "@/types";
import { HighlightedLine } from "@/components/comparison/HighlightedLine";
import { AnimatedNumber } from "@/components/status/AnimatedNumber";
import { ApprovalGate } from "@/components/approval/ApprovalGate";
import { CLASSIFICATION_STYLE, NEEDS_REVIEW_STYLE } from "@/lib/classificationStyles";
import clsx from "clsx";

export interface ComparisonTakeRef {
  take_number: number;
  line: string;
  character: string;
}

export function ComparisonView({
  open,
  onClose,
  sceneId,
  referenceLine,
  priorTake,
  currentTake,
  result,
  decision,
  submitting,
  onDecide,
}: {
  open: boolean;
  onClose: () => void;
  sceneId: string;
  referenceLine: string;
  priorTake: ComparisonTakeRef | null;
  currentTake: ComparisonTakeRef;
  result: ClassificationResult;
  decision: HumanDecision | null;
  submitting?: boolean;
  onDecide: (decision: HumanDecisionValue) => void;
}) {
  const style = result.status === "DRIFT" ? CLASSIFICATION_STYLE.DRIFT : NEEDS_REVIEW_STYLE;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-xl flex-col border-l border-line-strong bg-panel shadow-2xl"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-signal-drift" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-faint">
                    {sceneId} · comparison
                  </div>
                  <div className="text-[14px] font-medium">
                    Take {currentTake.take_number} vs. Take {priorTake?.take_number ?? "—"}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded p-1.5 text-text-muted hover:bg-raised hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* classification banner */}
              <div className={clsx("rounded-md border p-3", style.bg, style.border)}>
                <div className={clsx("font-mono text-[11px] font-semibold uppercase tracking-wide", style.text)}>
                  {style.label}
                </div>
                {result.reason && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-primary">{result.reason}</p>
                )}
              </div>

              {/* confidence meter */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-text-faint">
                  <span>Confidence</span>
                  <span className="text-text-primary text-[13px] font-medium">
                    <AnimatedNumber value={Math.round(result.confidence * 100)} suffix="%" />
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={clsx("h-full rounded-full", style.dot)}
                  />
                </div>
              </div>

              {/* script reference */}
              <div className="mt-5">
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-faint">
                  Script reference
                </div>
                <p className="mt-1 text-[13px] italic text-text-muted">&ldquo;{referenceLine}&rdquo;</p>
              </div>

              {/* side-by-side transcripts */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-line bg-void p-3.5">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-faint">
                    Take {priorTake?.take_number ?? "—"} · {priorTake?.character}
                  </div>
                  <p className="mt-2 text-[14px] leading-snug text-text-primary">
                    {priorTake ? (
                      <HighlightedLine line={priorTake.line} phrase={null} />
                    ) : (
                      <span className="text-text-faint">No prior take on record.</span>
                    )}
                  </p>
                </div>
                <div className="rounded-md border border-signal-drift/40 bg-signal-drift-dim/40 p-3.5">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-signal-drift">
                    Take {currentTake.take_number} · {currentTake.character}
                  </div>
                  <p className="mt-2 text-[14px] leading-snug text-text-primary">
                    <HighlightedLine line={currentTake.line} phrase={result.diverging_phrase} />
                  </p>
                </div>
              </div>

              {/* approval gate */}
              <div className="mt-6">
                <ApprovalGate decision={decision} submitting={submitting} onDecide={onDecide} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

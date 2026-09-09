"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import type { ClassificationResult, ProcessingStage } from "@/types";
import { STAGE_ORDER } from "@/lib/stageLabels";
import { CLASSIFICATION_STYLE, NEEDS_REVIEW_STYLE } from "@/lib/classificationStyles";

const SHORT_LABEL: Record<ProcessingStage, string> = {
  RECEIVED: "Received",
  EXTRACTING: "Extracting",
  COMPARING_SCRIPT: "Vs. script",
  COMPARING_PRIOR: "Vs. prior takes",
  CLASSIFYING: "Classifying",
  CLASSIFIED: "Result",
  NEEDS_REVIEW: "Result",
};

/**
 * Accepts live state updates from any backend (demo engine today, ADK
 * orchestrator + Firestore later) — purely a function of currentStage
 * and the (optional, terminal) classification result.
 */
export function AgentStateTimeline({
  currentStage,
  classification,
}: {
  currentStage: ProcessingStage;
  classification: ClassificationResult | null;
}) {
  const terminal = currentStage === "CLASSIFIED" || currentStage === "NEEDS_REVIEW";
  const currentIndex = terminal
    ? STAGE_ORDER.length
    : STAGE_ORDER.indexOf(currentStage);

  const resultStyle = terminal
    ? currentStage === "NEEDS_REVIEW"
      ? NEEDS_REVIEW_STYLE
      : classification
        ? CLASSIFICATION_STYLE[classification.status]
        : NEEDS_REVIEW_STYLE
    : null;

  const steps = [...STAGE_ORDER, "RESULT"] as const;

  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const isResult = s === "RESULT";
        const done = isResult ? terminal : i < currentIndex;
        const active = isResult ? false : i === currentIndex;
        const isLast = i === steps.length - 1;

        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className={clsx(
                  "flex h-4 w-4 items-center justify-center rounded-full border",
                  isResult && done
                    ? clsx(resultStyle?.bg, resultStyle?.border)
                    : done
                      ? "border-signal-match/50 bg-signal-match-dim"
                      : active
                        ? "border-signal-pending bg-signal-pending-dim"
                        : "border-line-strong bg-panel"
                )}
                animate={
                  active
                    ? { boxShadow: ["0 0 0 0px rgba(99,102,241,0.35)", "0 0 0 4px rgba(99,102,241,0)"] }
                    : {}
                }
                transition={active ? { duration: 1.2, repeat: Infinity } : {}}
              >
                {done && !active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={clsx(
                      "h-1.5 w-1.5 rounded-full",
                      isResult ? resultStyle?.dot : "bg-signal-match"
                    )}
                  />
                )}
                {active && (
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-signal-pending"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <span
                className={clsx(
                  "hidden font-mono text-[9px] uppercase tracking-wide sm:block",
                  active
                    ? "text-signal-pending"
                    : done
                      ? isResult
                        ? resultStyle?.text
                        : "text-text-muted"
                      : "text-text-faint"
                )}
              >
                {isResult ? (terminal ? resultStyle?.label : "Result") : SHORT_LABEL[s as ProcessingStage]}
              </span>
            </div>
            {!isLast && (
              <div className="mx-1 h-px flex-1 bg-line-strong">
                <motion.div
                  className="h-px bg-signal-match"
                  initial={{ width: "0%" }}
                  animate={{ width: i < currentIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

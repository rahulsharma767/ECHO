"use client";

import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import clsx from "clsx";
import type { HumanDecision, HumanDecisionValue } from "@/types";

/**
 * Human Approval Gate (Section 2 step [6]). The agent never auto-
 * rejects a take — this component is the only way a take's fate is
 * decided, and it always requires an explicit human click.
 */
export function ApprovalGate({
  decision,
  submitting,
  onDecide,
}: {
  decision: HumanDecision | null;
  submitting?: boolean;
  onDecide: (decision: HumanDecisionValue) => void;
}) {
  return (
    <div className="rounded-md border border-line-strong bg-void p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-text-faint">
        Human approval gate — required
      </div>

      <AnimatePresence mode="wait">
        {!decision ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <button
              disabled={submitting}
              onClick={() => onDecide("ACCEPT")}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded border border-signal-match/50 bg-signal-match-dim px-4 py-2.5 text-[13px] font-medium text-signal-match transition-colors hover:bg-signal-match/20 disabled:opacity-50"
              )}
            >
              Accept — intentional, still cuts
            </button>
            <button
              disabled={submitting}
              onClick={() => onDecide("FLAG_FOR_RESHOOT")}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded border border-signal-drift/60 bg-signal-drift px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-signal-drift/85 disabled:opacity-50"
              )}
            >
              Flag for reshoot
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="decided"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              "flex items-center justify-between rounded border px-4 py-2.5 text-[13px]",
              decision.decision === "ACCEPT"
                ? "border-signal-match/40 bg-signal-match-dim text-signal-match"
                : "border-signal-drift/40 bg-signal-drift-dim text-signal-drift"
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {decision.decision === "ACCEPT"
                ? "Accepted — logged as intentional"
                : "Flagged for reshoot"}
            </span>
            <span className="font-mono text-[10px] text-text-faint">
              {decision.decided_by} · {new Date(decision.decided_at).toLocaleTimeString(undefined, { hour12: false })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {submitting && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-text-faint">
          <RotateCcw className="h-3 w-3 animate-spin" /> writing to ledger…
        </div>
      )}
    </div>
  );
}

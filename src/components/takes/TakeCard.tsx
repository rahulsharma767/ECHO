"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import clsx from "clsx";
import type { TakeRecord } from "@/types";
import { AgentStateTimeline } from "@/components/takes/AgentStateTimeline";
import { StatusBadge } from "@/components/status/StatusBadge";
import { STAGE_LABEL } from "@/lib/stageLabels";
import { CLASSIFICATION_STYLE, NEEDS_REVIEW_STYLE } from "@/lib/classificationStyles";

function timeOnly(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

/**
 * TakeCard (TakeEventRenderer): accepts a TakeRecord — the same shape
 * Person A's Stream Analyst Agent will write to Firestore — and
 * renders its live progression through the pipeline. Knows nothing
 * about where the data came from.
 */
export function TakeCard({
  record,
  onOpenComparison,
}: {
  record: TakeRecord;
  onOpenComparison?: () => void;
}) {
  const { event, currentStage, classification, humanDecision } = record;
  const terminal = currentStage === "CLASSIFIED" || currentStage === "NEEDS_REVIEW";
  const needsApproval =
    terminal &&
    (classification?.status === "DRIFT" || currentStage === "NEEDS_REVIEW") &&
    !humanDecision;

  const style =
    currentStage === "NEEDS_REVIEW"
      ? NEEDS_REVIEW_STYLE
      : classification
        ? CLASSIFICATION_STYLE[classification.status]
        : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={clsx(
        "rounded-md border bg-panel p-4 transition-colors",
        needsApproval ? "border-signal-drift/50" : "border-line"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-baseline gap-2 font-mono text-[11px] text-text-muted">
          <span className="rounded bg-raised px-1.5 py-0.5 text-text-primary">
            {event.scene_id}
          </span>
          <span className="font-medium text-text-primary">TAKE {String(event.take_number).padStart(2, "0")}</span>
          <span>{event.character}</span>
          <span className="flex items-center gap-1 text-text-faint">
            <Clock3 className="h-3 w-3" /> {timeOnly(event.timestamp)}
          </span>
        </div>
        {terminal && style && <StatusBadge style={style} />}
      </div>

      <p className="mt-3 text-[15px] leading-snug text-text-primary">
        &ldquo;{event.transcribed_line}&rdquo;
      </p>

      <div className="mt-4">
        <AgentStateTimeline currentStage={currentStage} classification={classification} />
      </div>

      {!terminal && (
        <motion.p
          key={currentStage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 font-mono text-[11px] text-signal-pending"
        >
          {STAGE_LABEL[currentStage]}
        </motion.p>
      )}

      {terminal && classification && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-3 font-mono text-[11px] text-text-muted">
            <span>
              CONFIDENCE <span className="text-text-primary">{Math.round(classification.confidence * 100)}%</span>
            </span>
            {classification.reason && (
              <span className="hidden max-w-[360px] truncate text-text-faint sm:block">
                {classification.reason}
              </span>
            )}
          </div>

          {needsApproval ? (
            <button
              onClick={onOpenComparison}
              className="flex items-center gap-1.5 rounded border border-signal-drift/50 bg-signal-drift-dim px-2.5 py-1 text-[11px] font-medium text-signal-drift transition-colors hover:bg-signal-drift/20"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Review comparison
            </button>
          ) : humanDecision ? (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-signal-match" />
              {humanDecision.decision === "ACCEPT" ? "Accepted by AD" : "Flagged for reshoot"}
            </div>
          ) : (
            <div className="font-mono text-[11px] text-text-faint">Safe to intercut</div>
          )}
        </div>
      )}
    </motion.div>
  );
}

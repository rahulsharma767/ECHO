import type { ProcessingStage } from "@/types";

export const STAGE_LABEL: Record<ProcessingStage, string> = {
  RECEIVED: "New take received",
  EXTRACTING: "Extracting transcript…",
  COMPARING_SCRIPT: "Comparing to script reference line…",
  COMPARING_PRIOR: "Comparing to prior takes…",
  CLASSIFYING: "Classifying…",
  CLASSIFIED: "Classified",
  NEEDS_REVIEW: "Low confidence — routed for review",
};

/** Ordered pipeline for the timeline UI. Terminal states (CLASSIFIED /
 * NEEDS_REVIEW) render as the final slot, whichever is reached. */
export const STAGE_ORDER: ProcessingStage[] = [
  "RECEIVED",
  "EXTRACTING",
  "COMPARING_SCRIPT",
  "COMPARING_PRIOR",
  "CLASSIFYING",
];

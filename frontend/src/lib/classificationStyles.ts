import type { Classification } from "@/types";

export interface ClassificationStyle {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
}

export const CLASSIFICATION_STYLE: Record<Classification, ClassificationStyle> = {
  MATCH: {
    label: "MATCH",
    dot: "bg-signal-match",
    text: "text-signal-match",
    bg: "bg-signal-match-dim",
    border: "border-signal-match/40",
  },
  ACCEPTABLE_ADLIB: {
    label: "ACCEPTABLE AD-LIB",
    dot: "bg-signal-adlib",
    text: "text-signal-adlib",
    bg: "bg-signal-adlib-dim",
    border: "border-signal-adlib/40",
  },
  DRIFT: {
    label: "DRIFT DETECTED",
    dot: "bg-signal-drift",
    text: "text-signal-drift",
    bg: "bg-signal-drift-dim",
    border: "border-signal-drift/40",
  },
};

export const NEEDS_REVIEW_STYLE: ClassificationStyle = {
  label: "NEEDS REVIEW",
  dot: "bg-signal-pending",
  text: "text-signal-pending",
  bg: "bg-signal-pending-dim",
  border: "border-signal-pending/40",
};

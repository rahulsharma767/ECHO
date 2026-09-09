"use client";

import { motion } from "motion/react";

/**
 * Splits `line` around the first case-insensitive occurrence of
 * `phrase` and wraps it in an animated highlight. If phrase is null or
 * not found, the line renders unchanged.
 */
export function HighlightedLine({
  line,
  phrase,
  tone = "drift",
}: {
  line: string;
  phrase: string | null;
  tone?: "drift" | "neutral";
}) {
  if (!phrase) return <>&ldquo;{line}&rdquo;</>;

  const idx = line.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return <>&ldquo;{line}&rdquo;</>;

  const before = line.slice(0, idx);
  const match = line.slice(idx, idx + phrase.length);
  const after = line.slice(idx + phrase.length);

  return (
    <>
      &ldquo;{before}
      <motion.mark
        initial={{ backgroundColor: "rgba(236,72,153,0)" }}
        animate={{ backgroundColor: "rgba(236,72,153,0.28)" }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className={
          tone === "drift"
            ? "rounded px-0.5 text-signal-drift underline decoration-signal-drift/60 decoration-2 underline-offset-2"
            : "rounded px-0.5"
        }
      >
        {match}
      </motion.mark>
      {after}&rdquo;
    </>
  );
}

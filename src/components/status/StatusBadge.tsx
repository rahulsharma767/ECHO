"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import type { ClassificationStyle } from "@/lib/classificationStyles";

export function StatusBadge({
  style,
  size = "md",
}: {
  style: ClassificationStyle;
  size?: "sm" | "md";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded border font-mono uppercase tracking-wide",
        style.bg,
        style.border,
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"
      )}
    >
      <motion.span
        className={clsx("h-1.5 w-1.5 rounded-full", style.dot)}
        initial={{ boxShadow: "0 0 0 0 transparent" }}
        animate={{
          boxShadow: [
            "0 0 0 0 transparent",
            `0 0 6px 1px currentColor`,
            "0 0 0 0 transparent",
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ color: "inherit" }}
      />
      <span className={style.text}>{style.label}</span>
    </motion.div>
  );
}

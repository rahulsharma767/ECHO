"use client";

import { AnimatePresence, motion } from "motion/react";
import { Radio } from "lucide-react";
import type { TakeRecord } from "@/types";
import { TakeCard } from "@/components/takes/TakeCard";

export function LiveTakeFeed({
  takes,
  onOpenComparison,
}: {
  takes: TakeRecord[];
  onOpenComparison: (take: TakeRecord) => void;
}) {
  if (takes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-line py-16 text-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Radio className="h-6 w-6 text-text-faint" strokeWidth={1.5} />
        </motion.div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-faint">
          Awaiting first take on this scene
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {takes.map((t) => (
          <TakeCard
            key={t.event.event_id}
            record={t}
            onOpenComparison={() => onOpenComparison(t)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

function format(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function LiveClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTime(format(new Date())), 1000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time sync of client clock on mount
    setTime(format(new Date()));
    return () => clearInterval(id);
  }, []);

  return (
    <div className="font-mono text-[11px] tabular tracking-wider text-text-faint">
      {time ?? "--:--:--"}
    </div>
  );
}

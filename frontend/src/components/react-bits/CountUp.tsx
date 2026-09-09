"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({ to, from = 0, direction = "up", delay = 0, duration = 2, className = "", startWhen = true, separator = "", onStart, onEnd }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? to : from);
  const springValue = useSpring(motionValue, { damping: 20 + 40 * (1 / duration), stiffness: 100 * (1 / duration) });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const getDecimalPlaces = (num: number) => {
    const str = num.toString();
    if (!str.includes(".")) return 0;
    const decimals = str.split(".")[1];
    return parseInt(decimals) !== 0 ? decimals.length : 0;
  };
  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));
  const formatValue = useCallback((latest: number) => {
    const hasDecimals = maxDecimals > 0;
    const formatted = Intl.NumberFormat("en-US", { useGrouping: !!separator, minimumFractionDigits: hasDecimals ? maxDecimals : 0, maximumFractionDigits: hasDecimals ? maxDecimals : 0 }).format(latest);
    return separator ? formatted.replace(/,/g, separator) : formatted;
  }, [maxDecimals, separator]);

  useEffect(() => {
    if (ref.current) ref.current.textContent = formatValue(direction === "down" ? to : from);
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (!isInView || !startWhen) return;
    onStart?.();
    const timeoutId = setTimeout(() => motionValue.set(direction === "down" ? from : to), delay * 1000);
    const durationTimeoutId = setTimeout(() => onEnd?.(), delay * 1000 + duration * 1000);
    return () => { clearTimeout(timeoutId); clearTimeout(durationTimeoutId); };
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);

  useEffect(() => springValue.on("change", (latest) => { if (ref.current) ref.current.textContent = formatValue(latest); }), [springValue, formatValue]);
  return <span className={className} ref={ref} />;
}

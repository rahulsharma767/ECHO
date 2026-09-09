"use client";

import CountUp from "@/components/react-bits/CountUp";

export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <>
      <CountUp to={value} duration={0.8} className="tabular" />
      {suffix}
    </>
  );
}

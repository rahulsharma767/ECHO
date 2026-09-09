"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import "./SquircleShift.css";

export interface SquircleShiftProps {
  width?: number | string;
  height?: number | string;
  speed?: number;
  colorLayers?: number;
  gridFrequency?: number;
  gridIntensity?: number;
  waveSpeed?: number;
  waveIntensity?: number;
  spiralIntensity?: number;
  lineThickness?: number;
  falloff?: number;
  centerX?: number;
  centerY?: number;
  colorTint?: string;
  lightBackground?: string;
  darkBackground?: string;
  brightness?: number;
  phaseOffset?: number;
  className?: string;
}

/**
 * ECHO-ready local implementation of the Squircle Shift visual.
 *
 * It intentionally mirrors the public React Bits Pro prop vocabulary so the
 * real registry component can be swapped in later without changing ECHO's
 * layout. The visual is CSS-only to keep the hackathon demo lightweight.
 */
export default function SquircleShift({
  width = "100%",
  height = "100%",
  speed = 0.3,
  colorLayers = 3,
  gridFrequency = 25,
  gridIntensity = 1,
  waveSpeed = 0.2,
  waveIntensity = 0.1,
  spiralIntensity = 1,
  lineThickness = 0.06,
  falloff = 1,
  centerX = 0.5,
  centerY = 0.5,
  colorTint = "#8B5CF6",
  lightBackground = "#ffffff",
  darkBackground = "#050509",
  brightness = 1,
  phaseOffset = 10,
  className = "",
}: SquircleShiftProps) {
  const cells = useMemo(() => {
    const count = 15 * 7;
    return Array.from({ length: count }, (_, i) => {
      const wave = Math.sin(i * 0.77 + phaseOffset) * 0.5 + 0.5;
      const focus = 1 - Math.min(1, Math.abs(i % 15 - 7) / 8);
      const opacity = 0.08 + wave * 0.18 + focus * 0.08;
      const scale = 0.74 + wave * 0.22;
      const delay = (i * 0.071) % 2.7;
      return { i, opacity, scale, delay };
    });
  }, [phaseOffset]);

  const style = {
    width,
    height,
    "--sq-speed": `${Math.max(0.05, 1 / Math.max(0.05, speed))}s`,
    "--sq-wave": Math.max(0.05, waveSpeed * 5),
    "--sq-intensity": gridIntensity * brightness,
    "--sq-thickness": `${Math.max(0.035, lineThickness) * 10}px`,
    "--sq-falloff": falloff,
    "--sq-cx": `${centerX * 100}%`,
    "--sq-cy": `${centerY * 100}%`,
    "--sq-spiral": spiralIntensity,
    "--sq-wave-intensity": waveIntensity,
    "--sq-layers": colorLayers,
    "--sq-grid": gridFrequency,
    "--sq-tint": colorTint,
    "--sq-bg": darkBackground,
    "--sq-light-bg": lightBackground,
    "--sq-brightness": brightness,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`squircle-shift ${className}`}
      style={style}
    >
      <div className="squircle-shift__wash" />
      <div className="squircle-shift__grid">
        {cells.map(({ i, opacity, scale, delay }) => (
          <span
            key={i}
            className="squircle-shift__cell"
            style={
              {
                "--sq-i": i,
                "--sq-opacity": opacity,
                "--sq-scale": scale,
                "--sq-delay": `${delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="squircle-shift__vignette" />
    </div>
  );
}

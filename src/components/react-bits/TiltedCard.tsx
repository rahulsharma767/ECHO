"use client";

import type { SpringOptions } from "motion/react";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

interface TiltedCardProps {
  imageSrc: React.ComponentProps<"img">["src"];
  altText?: string;
  captionText?: string;
  containerHeight?: React.CSSProperties["height"];
  containerWidth?: React.CSSProperties["width"];
  imageHeight?: React.CSSProperties["height"];
  imageWidth?: React.CSSProperties["width"];
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  overlayContent?: React.ReactNode;
  displayOverlayContent?: boolean;
}

const springValues: SpringOptions = { damping: 30, stiffness: 100, mass: 2 };

export default function TiltedCard({
  imageSrc,
  altText = "Tilted card image",
  captionText = "",
  containerHeight = "300px",
  containerWidth = "100%",
  imageHeight = "300px",
  imageWidth = "300px",
  scaleOnHover = 1.1,
  rotateAmplitude = 14,
  showMobileWarning = true,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = false,
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, { stiffness: 350, damping: 30, mass: 1 });
  const [lastY, setLastY] = useState(0);

  function handleMouse(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
    setLastY(offsetY);
    rotateFigcaption.set(-(offsetY - lastY) * 0.6);
  }

  return (
    <figure ref={ref} className="relative flex h-full w-full flex-col items-center justify-center [perspective:800px]" style={{ height: containerHeight, width: containerWidth }} onMouseMove={handleMouse} onMouseEnter={() => { scale.set(scaleOnHover); opacity.set(1); }} onMouseLeave={() => { opacity.set(0); scale.set(1); rotateX.set(0); rotateY.set(0); rotateFigcaption.set(0); }}>
      {showMobileWarning && <div className="absolute top-4 block text-center text-sm sm:hidden">This effect is not optimized for mobile. Check on desktop.</div>}
      <motion.div className="relative [transform-style:preserve-3d]" style={{ width: imageWidth, height: imageHeight, rotateX, rotateY, scale }}>
        <motion.img src={imageSrc} alt={altText} className="absolute left-0 top-0 rounded-[15px] object-cover [transform:translateZ(0)] will-change-transform" style={{ width: imageWidth, height: imageHeight }} />
        {displayOverlayContent && overlayContent && <motion.div className="absolute left-0 top-0 z-[2] [transform:translateZ(30px)] will-change-transform">{overlayContent}</motion.div>}
      </motion.div>
      {showTooltip && <motion.figcaption className="pointer-events-none absolute left-0 top-0 z-[3] hidden rounded-[4px] bg-white px-[10px] py-[4px] text-[10px] text-[#2d2d2d] opacity-0 sm:block" style={{ x, y, opacity, rotate: rotateFigcaption }}>{captionText}</motion.figcaption>}
    </figure>
  );
}

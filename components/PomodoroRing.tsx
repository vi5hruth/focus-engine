"use client";

import { cn } from "@/lib/utils";
import type { PomodoroPhase } from "@/lib/types";

interface PomodoroRingProps {
  progress: number; // 0..1, fraction of phase elapsed
  phase: PomodoroPhase;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const PHASE_COLOR: Record<PomodoroPhase, string> = {
  focus: "stroke-emerald-500",
  shortBreak: "stroke-indigo-500",
  longBreak: "stroke-indigo-400",
};

export function PomodoroRing({
  progress,
  phase,
  size = 320,
  strokeWidth = 10,
  children,
}: PomodoroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-zinc-800/80"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn(
            "transition-[stroke-dashoffset] duration-150 ease-linear",
            PHASE_COLOR[phase]
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

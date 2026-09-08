"use client";

import { useTimerEngine } from "@/hooks/useTimerEngine";

export function TimerEngineProvider({ children }: { children: React.ReactNode }) {
  useTimerEngine();
  return <>{children}</>;
}

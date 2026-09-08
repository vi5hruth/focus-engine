"use client";

import { useEffect, useRef } from "react";
import { useClockStore } from "@/lib/store/useClockStore";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { useTaskStore } from "@/lib/store/useTaskStore";
import { audioEngine } from "@/lib/audio/audioEngine";
import type { WorkerEvent } from "@/lib/types";

/**
 * Mounts exactly once (see <TimerEngineProvider>). Spins up the background
 * worker, forwards its wall-clock ticks into useClockStore, and handles
 * side effects that must fire exactly once per threshold crossing
 * (Pomodoro phase completion + chime), which is why we track
 * `firedCompletionRef` rather than deriving "is it time yet" reactively
 * from render.
 */
export function useTimerEngine() {
  const workerRef = useRef<Worker | null>(null);
  const firedCompletionRef = useRef(false);

  useEffect(() => {
    const worker = new Worker("/timer-worker.js");
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      if (event.data.type !== "TICK") return;
      const now = event.data.payload.now;
      useClockStore.getState().setNow(now);

      const timer = useTimerStore.getState();
      if (timer.status !== "running") return;

      if (timer.mode === "pomodoro") {
        const remaining = timer.getPhaseRemainingMs(now);
        if (remaining <= 0 && !firedCompletionRef.current) {
          firedCompletionRef.current = true;
          const elapsedSeconds = timer.getElapsedMs(now) / 1000;

          if (timer.activeTaskId) {
            useTaskStore
              .getState()
              .addTimeSpent(timer.activeTaskId, elapsedSeconds);
          }
          if (timer.soundEnabled) audioEngine.playCompletionChime();
          timer.advancePomodoroPhase();
          window.setTimeout(() => {
            firedCompletionRef.current = false;
          }, 500);
        }
      }
    };

    worker.postMessage({ type: "START", payload: { epoch: Date.now() } });

    // Re-sync immediately when the tab regains visibility — the worker
    // never stopped, but this guarantees the very next paint reflects a
    // fresh Date.now() rather than a stale queued tick.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        useClockStore.getState().setNow(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      worker.postMessage({ type: "STOP" });
      worker.terminate();
      workerRef.current = null;
    };
  }, []);
}

"use client";

import { useEffect, useRef } from "react";
import { useClockStore } from "@/lib/store/useClockStore";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { useTaskStore } from "@/lib/store/useTaskStore";
import { audioEngine } from "@/lib/audio/audioEngine";
import type { WorkerEvent } from "@/lib/types";

/**
 * Mounts exactly once (see <TimerEngineProvider>).
 * Controls background worker lifecycle, syncs wall-clock ticks into useClockStore,
 * and executes side-effects exactly once per phase transition without relying
 * on throttled main-thread timeouts.
 */
export function useTimerEngine() {
  const workerRef = useRef<Worker | null>(null);
  const completedPhaseKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Initialize Worker
    const worker = new Worker("/timer-worker.js");
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      if (event.data.type !== "TICK") return;
      const now = event.data.payload.now;

      // Update wall-clock store for high-frequency subscriber components
      useClockStore.getState().setNow(now);

      const timer = useTimerStore.getState();
      if (timer.status !== "running") return;

      if (timer.mode === "pomodoro") {
        const remaining = timer.getPhaseRemainingMs(now);

        // Derive a unique phase identity key (fallback to segmentStartedAt if completedCycles is absent)
        // ❌ Old (pomodoroPhase does not exist at top level)
        // ✅ Correct (nested inside timer.pomodoro)
        const phaseKey = `${timer.pomodoro.phase}-${timer.segmentStartedAt ?? 0}`;  
        if (remaining <= 0 && completedPhaseKeyRef.current !== phaseKey) {
          completedPhaseKeyRef.current = phaseKey;

          const elapsedSeconds = timer.getElapsedMs(now) / 1000;
          if (timer.activeTaskId) {
            useTaskStore
              .getState()
              .addTimeSpent(timer.activeTaskId, elapsedSeconds);
          }

          if (timer.soundEnabled) {
            audioEngine.playCompletionChime();
          }

          // Fallback notification for users working in another tab/window
          if (typeof window !== "undefined" && "Notification" in window) {
            if (document.hidden && Notification.permission === "granted") {
              new Notification("Focus Session Complete", {
                body: "Time for your scheduled break.",
                icon: "/favicon.ico",
              });
            }
          }

          // Advance phase; this changes segmentStartedAt/phase, clearing the guard naturally
          timer.advancePomodoroPhase();
        }
      }
    };

    // 2. Start worker only if timer is already running on mount
    if (useTimerStore.getState().status === "running") {
      worker.postMessage({ type: "START" });
    }

    // 3. Sync worker execution to timer state changes (saves background CPU & message-passing overhead)
    const unsubscribeTimer = useTimerStore.subscribe((state, prevState) => {
      if (state.status === "running" && prevState.status !== "running") {
        worker.postMessage({ type: "START" });
      } else if (state.status !== "running" && prevState.status === "running") {
        worker.postMessage({ type: "STOP" });
      }
    });

    // 4. Force immediate paint sync when tab regains focus
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        useClockStore.getState().setNow(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 5. Teardown
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribeTimer();
      worker.postMessage({ type: "STOP" });
      worker.terminate();
      workerRef.current = null;
    };
  }, []);
}
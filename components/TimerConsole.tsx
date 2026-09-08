// components/TimerConsole.tsx
"use client";

import { memo } from "react";
import { Play, Pause, SplitSquareHorizontal, RotateCcw, Target, X } from "lucide-react";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { useClockStore } from "@/lib/store/useClockStore";
import { useTaskStore } from "@/lib/store/useTaskStore";
import { useConsoleUIStore, SPLIT_PRESETS } from "@/lib/store/useConsoleUIStore";
import { audioEngine } from "@/lib/audio/audioEngine";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PomodoroRing } from "@/components/PomodoroRing";
import { cn, formatClock } from "@/lib/utils";

/**
 * Isolated Hot-Path: Pomodoro Display
 * Only this leaf component re-renders on clock ticks (10Hz).
 */
const PomodoroDisplay = memo(function PomodoroDisplay() {
  const now = useClockStore((s) => s.now);
  const pomodoro = useTimerStore((s) => s.pomodoro);
  const getElapsedMs = useTimerStore((s) => s.getElapsedMs);

  const elapsedMs = getElapsedMs(now);
  const remainingMs = Math.max(0, pomodoro.phaseTargetMs - elapsedMs);
  const progress = pomodoro.phaseTargetMs > 0 ? elapsedMs / pomodoro.phaseTargetMs : 0;

  return (
    <PomodoroRing progress={progress} phase={pomodoro.phase}>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          {pomodoro.phase === "focus"
            ? "Focus"
            : pomodoro.phase === "shortBreak"
              ? "Short break"
              : "Long break"}
          {" · cycle "}
          {pomodoro.cycleCount + 1}
        </span>
        <span
          className="font-mono text-5xl font-semibold tabular-nums text-zinc-50 sm:text-6xl"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatClock(remainingMs, false)}
        </span>
      </div>
    </PomodoroRing>
  );
});

/**
 * Isolated Hot-Path: Chronograph Display
 * Only this leaf component re-renders on clock ticks (10Hz).
 */
const ChronographDisplay = memo(function ChronographDisplay() {
  const now = useClockStore((s) => s.now);
  const getElapsedMs = useTimerStore((s) => s.getElapsedMs);
  const elapsedMs = getElapsedMs(now);

  return (
    <span
      className="font-mono text-6xl font-semibold tabular-nums text-zinc-50 sm:text-7xl md:text-8xl"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatClock(elapsedMs)}
    </span>
  );
});

/**
 * Isolated Laps Table: Only re-renders when a lap is added/reset
 */
const LapHistoryTable = memo(function LapHistoryTable({
  laps,
}: {
  laps: ReturnType<typeof useTimerStore.getState>["laps"];
}) {
  if (laps.length === 0) return null;

  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-800/80">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-zinc-900 text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Label</th>
            <th className="px-3 py-2 text-right font-medium">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {/* Slice before reverse to avoid mutating source */}
          {laps
            .slice()
            .reverse()
            .map((lap, idx) => (
              <tr key={lap.id} className="text-zinc-300">
                <td className="px-3 py-1.5 text-zinc-600">{laps.length - idx}</td>
                <td className="px-3 py-1.5">{lap.label}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                  {formatClock(lap.durationSeconds * 1000, false)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
});

/**
 * Static Console Container: Re-renders ONLY on discrete user interactions
 */
export function TimerConsole() {
  // Domain subscriptions (discrete updates only, no 10Hz ticks)
  const mode = useTimerStore((s) => s.mode);
  const status = useTimerStore((s) => s.status);
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const laps = useTimerStore((s) => s.laps);
  const setMode = useTimerStore((s) => s.setMode);
  const setActiveTask = useTimerStore((s) => s.setActiveTask);

  // Selector optimization: Only select the active task object, avoiding full tasks array subscriptions
  const activeTask = useTaskStore((s) =>
    s.tasks.find((t) => t.id === activeTaskId) ?? null
  );

  const splitLabel = useConsoleUIStore((s) => s.splitLabel);
  const setSplitLabel = useConsoleUIStore((s) => s.setSplitLabel);
  const showResetConfirm = useConsoleUIStore((s) => s.showResetConfirm);
  const performToggle = useConsoleUIStore((s) => s.performToggle);
  const performSplit = useConsoleUIStore((s) => s.performSplit);
  const requestReset = useConsoleUIStore((s) => s.requestReset);
  const cancelReset = useConsoleUIStore((s) => s.cancelReset);
  const confirmReset = useConsoleUIStore((s) => s.confirmReset);

  const isRunning = status === "running";

  const handleToggle = () => {
    // Unlock AudioContext on direct user gesture to prevent browser autoplay block
    audioEngine.warmup();
    performToggle();
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8">
      {/* Top Header & Task Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "chronograph" | "pomodoro")}
        >
          <TabsList>
            <TabsTrigger value="chronograph">Chronograph</TabsTrigger>
            <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTask ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-500/10 py-1 pl-1 pr-3 text-xs text-emerald-300",
              isRunning && "animate-ring-pulse"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
              <Target className="h-3 w-3" />
            </span>
            <span className="max-w-[14rem] truncate font-medium">
              {activeTask.title}
            </span>
            <button
              onClick={() => setActiveTask(null)}
              className="ml-1 text-emerald-500/70 hover:text-emerald-300"
              aria-label="Unfocus task"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-zinc-600">
            No task focused — pick one from the board →
          </span>
        )}
      </div>

      {/* Main Display: Isolated Render Subtrees */}
      <div className="flex flex-col items-center justify-center py-6">
        {mode === "pomodoro" ? <PomodoroDisplay /> : <ChronographDisplay />}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          variant="primary"
          onClick={handleToggle}
          className="min-w-32"
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Start
            </>
          )}
        </Button>

        {mode === "chronograph" && (
          <Button
            size="lg"
            variant="outline"
            onClick={performSplit}
            disabled={!isRunning}
          >
            <SplitSquareHorizontal className="h-4 w-4" /> Split
          </Button>
        )}

        {!showResetConfirm ? (
          <Button size="lg" variant="ghost" onClick={requestReset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-500/5 px-3 py-1.5">
            <span className="text-xs text-red-300">Discard session?</span>
            <Button size="sm" variant="destructive" onClick={confirmReset}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelReset}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Chronograph Split Presets */}
      {mode === "chronograph" && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {SPLIT_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setSplitLabel(preset)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                splitLabel === preset
                  ? "border-emerald-700/60 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      )}

      {/* Chronograph Lap History */}
      {mode === "chronograph" && <LapHistoryTable laps={laps} />}
    </div>
  );
}
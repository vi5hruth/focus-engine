"use client";

import { useMemo } from "react";
import { Play, Pause, SplitSquareHorizontal, RotateCcw, Target, X } from "lucide-react";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { useClockStore } from "@/lib/store/useClockStore";
import { useTaskStore } from "@/lib/store/useTaskStore";
import { useConsoleUIStore, SPLIT_PRESETS } from "@/lib/store/useConsoleUIStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PomodoroRing } from "@/components/PomodoroRing";
import { cn, formatClock } from "@/lib/utils";

export function TimerConsole() {
  const now = useClockStore((s) => s.now);
  const mode = useTimerStore((s) => s.mode);
  const status = useTimerStore((s) => s.status);
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const laps = useTimerStore((s) => s.laps);
  const pomodoro = useTimerStore((s) => s.pomodoro);
  const setMode = useTimerStore((s) => s.setMode);
  const setActiveTask = useTimerStore((s) => s.setActiveTask);
  const getElapsedMs = useTimerStore((s) => s.getElapsedMs);

  const tasks = useTaskStore((s) => s.tasks);

  const splitLabel = useConsoleUIStore((s) => s.splitLabel);
  const setSplitLabel = useConsoleUIStore((s) => s.setSplitLabel);
  const showResetConfirm = useConsoleUIStore((s) => s.showResetConfirm);
  const performToggle = useConsoleUIStore((s) => s.performToggle);
  const performSplit = useConsoleUIStore((s) => s.performSplit);
  const requestReset = useConsoleUIStore((s) => s.requestReset);
  const cancelReset = useConsoleUIStore((s) => s.cancelReset);
  const confirmReset = useConsoleUIStore((s) => s.confirmReset);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const elapsedMs = getElapsedMs(now);
  const isRunning = status === "running";

  const phaseProgress = useMemo(() => {
    if (mode !== "pomodoro" || pomodoro.phaseTargetMs === 0) return 0;
    return elapsedMs / pomodoro.phaseTargetMs;
  }, [mode, elapsedMs, pomodoro.phaseTargetMs]);

  const remainingMs = Math.max(0, pomodoro.phaseTargetMs - elapsedMs);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 sm:p-8">
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
            <span className="max-w-[14rem] truncate font-medium">{activeTask.title}</span>
            <button
              onClick={() => setActiveTask(null)}
              className="ml-1 text-emerald-500/70 hover:text-emerald-300"
              aria-label="Unfocus task"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-zinc-600">No task focused — pick one from the board →</span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-6">
        {mode === "pomodoro" ? (
          <PomodoroRing progress={phaseProgress} phase={pomodoro.phase}>
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
        ) : (
          <span
            className="font-mono text-6xl font-semibold tabular-nums text-zinc-50 sm:text-7xl md:text-8xl"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatClock(elapsedMs)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" variant="primary" onClick={performToggle} className="min-w-32">
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

      {mode === "chronograph" && laps.length > 0 && (
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
              {[...laps].reverse().map((lap, idx) => (
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
      )}
    </div>
  );
}

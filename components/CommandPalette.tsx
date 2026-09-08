"use client";

import { Command } from "cmdk";
import { useMemo } from "react";
import {
  Timer,
  Hourglass,
  Play,
  Pause,
  Target,
  Wind,
  CloudRain,
  Music2,
  VolumeX,
} from "lucide-react";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { useTaskStore } from "@/lib/store/useTaskStore";
import { audioEngine } from "@/lib/audio/audioEngine";
import type { AmbientTrack } from "@/lib/audio/audioEngine";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const mode = useTimerStore((s) => s.mode);
  const status = useTimerStore((s) => s.status);
  const setMode = useTimerStore((s) => s.setMode);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const setActiveTask = useTimerStore((s) => s.setActiveTask);
  const setAmbientTrack = useTimerStore((s) => s.setAmbientTrack);

  const tasks = useTaskStore((s) => s.tasks);
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.isCompleted), [tasks]);

  function run(action: () => void) {
    action();
    onOpenChange(false);
  }

  function setAmbient(track: AmbientTrack) {
    setAmbientTrack(track);
    if (track === "none") audioEngine.stopAmbient();
    else audioEngine.setAmbient(track);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[15vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg animate-fade-in overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" className="text-zinc-100">
          <div className="border-b border-zinc-800/80 px-3">
            <Command.Input
              autoFocus
              placeholder="Type a command or search tasks…"
              className="w-full bg-transparent px-1 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-xs text-zinc-600">
              No matches.
            </Command.Empty>

            <Command.Group
              heading="Timer"
              className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600 [&_[cmdk-group-items]]:mt-1"
            >
              <Command.Item
                onSelect={() => run(() => (status === "running" ? pause(Date.now()) : start(Date.now())))}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
              >
                {status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {status === "running" ? "Pause session" : "Start session"}
              </Command.Item>
              <Command.Item
                onSelect={() => run(() => setMode("chronograph"))}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
              >
                <Timer className="h-4 w-4" />
                Switch to Chronograph
                {mode === "chronograph" && <span className="ml-auto text-[10px] text-emerald-500">active</span>}
              </Command.Item>
              <Command.Item
                onSelect={() => run(() => setMode("pomodoro"))}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
              >
                <Hourglass className="h-4 w-4" />
                Switch to Pomodoro
                {mode === "pomodoro" && <span className="ml-auto text-[10px] text-emerald-500">active</span>}
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading="Ambient sound"
              className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600 [&_[cmdk-group-items]]:mt-1"
            >
              <Command.Item
                onSelect={() => run(() => setAmbient("pink"))}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
              >
                <CloudRain className="h-4 w-4" /> Play pink noise
              </Command.Item>
              <Command.Item
                onSelect={() => run(() => setAmbient("brown"))}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
              >
                <Wind className="h-4 w-4" /> Play brown noise
              </Command.Item>
              <Command.Item
                onSelect={() => run(() => setAmbient("drone"))}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
              >
                <Music2 className="h-4 w-4" /> Play focus drone
              </Command.Item>
              <Command.Item
                onSelect={() => run(() => setAmbient("none"))}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
              >
                <VolumeX className="h-4 w-4" /> Stop ambient sound
              </Command.Item>
            </Command.Group>

            {pendingTasks.length > 0 && (
              <Command.Group
                heading="Focus a task"
                className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600 [&_[cmdk-group-items]]:mt-1"
              >
                {pendingTasks.map((task) => (
                  <Command.Item
                    key={task.id}
                    value={`${task.title} ${task.subjectTag}`}
                    onSelect={() => run(() => setActiveTask(task.id))}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 aria-selected:bg-zinc-900 aria-selected:text-zinc-50"
                  >
                    <Target className="h-4 w-4" />
                    <span className="truncate">{task.title}</span>
                    <span className="ml-auto text-[10px] text-zinc-600">{task.subjectTag}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

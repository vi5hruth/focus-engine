"use client";

import { useMemo, useState } from "react";
import { Plus, Target, Check, Trash2, Flame, Clock3 } from "lucide-react";
import { useTaskStore } from "@/lib/store/useTaskStore";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { useClockStore } from "@/lib/store/useClockStore";
import { Button } from "@/components/ui/button";
import { cn, formatMinutesLabel } from "@/lib/utils";
import type { Task, TaskPriority } from "@/lib/types";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: "border-red-900/60 bg-red-500/10 text-red-300",
  medium: "border-amber-900/60 bg-amber-500/10 text-amber-300",
  low: "border-zinc-800 bg-zinc-800/40 text-zinc-400",
};

function TaskRow({ task }: { task: Task }) {
  const activeTaskId = useTimerStore((s) => s.activeTaskId);
  const status = useTimerStore((s) => s.status);
  const setActiveTask = useTimerStore((s) => s.setActiveTask);
  const getElapsedMs = useTimerStore((s) => s.getElapsedMs);
  const laps = useTimerStore((s) => s.laps);
  const resetTimer = useTimerStore((s) => s.reset);
  const now = useClockStore((s) => s.now);

  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const removeTask = useTaskStore((s) => s.removeTask);
  const addTimeSpent = useTaskStore((s) => s.addTimeSpent);
  const attachLapBreakdowns = useTaskStore((s) => s.attachLapBreakdowns);

  const isFocused = activeTaskId === task.id;
  const isRunning = isFocused && status === "running";

  function handleFocusThis() {
    setActiveTask(isFocused ? null : task.id);
  }

  function handleMarkDone() {
    if (isFocused) {
      const elapsedSeconds = getElapsedMs(now) / 1000;
      if (elapsedSeconds > 0) addTimeSpent(task.id, elapsedSeconds);
      if (laps.length > 0) attachLapBreakdowns(task.id, laps);
      resetTimer();
    }
    toggleComplete(task.id);
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-3 transition-colors",
        task.isCompleted
          ? "border-zinc-900 bg-zinc-950/60"
          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
      )}
    >
      <button
        onClick={handleMarkDone}
        aria-label={task.isCompleted ? "Mark as not done" : "Mark as done"}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.isCompleted
            ? "border-emerald-600 bg-emerald-500/20 text-emerald-400"
            : "border-zinc-700 text-transparent hover:border-emerald-600"
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              task.isCompleted ? "text-zinc-500 line-through" : "text-zinc-100"
            )}
          >
            {task.title}
          </span>
          {isFocused && (
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border border-emerald-600 text-emerald-400",
                isRunning && "animate-ring-pulse"
              )}
            >
              <Target className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-zinc-500">
            {task.subjectTag}
          </span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 capitalize",
              PRIORITY_STYLE[task.priority]
            )}
          >
            {task.priority}
          </span>
          {task.timeSpentSeconds > 0 && (
            <span className="flex items-center gap-1 text-zinc-600">
              <Clock3 className="h-3 w-3" />
              {formatMinutesLabel(task.timeSpentSeconds)}
              {task.estimatedMinutes ? ` / ${task.estimatedMinutes}m` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!task.isCompleted && (
          <Button
            size="sm"
            variant={isFocused ? "subtle" : "outline"}
            onClick={handleFocusThis}
            className="h-7 px-2 text-[11px]"
          >
            {isFocused ? "Unfocus" : "Focus this"}
          </Button>
        )}
        <button
          onClick={() => removeTask(task.id)}
          aria-label="Delete task"
          className="rounded p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddTaskForm({ onDone }: { onDone: () => void }) {
  const addTask = useTaskStore((s) => s.addTask);
  const [title, setTitle] = useState("");
  const [subjectTag, setSubjectTag] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title,
      subjectTag,
      priority,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
    });
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
      />
      <div className="flex gap-2">
        <input
          value={subjectTag}
          onChange={(e) => setSubjectTag(e.target.value)}
          placeholder="Subject e.g. Algorithms"
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 focus:border-emerald-700 focus:outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value.replace(/\D/g, ""))}
          placeholder="Est. min"
          inputMode="numeric"
          className="w-20 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="primary">
          Add task
        </Button>
      </div>
    </form>
  );
}

export function TaskBoard() {
  const tasks = useTaskStore((s) => s.tasks);
  const [showAddForm, setShowAddForm] = useState(false);

  const { pending, done } = useMemo(() => {
    const pending = tasks.filter((t) => !t.isCompleted);
    const done = tasks.filter((t) => t.isCompleted);
    return { pending, done };
  }, [tasks]);

  const completionPct =
    tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Task board</h2>
          <p className="text-xs text-zinc-500">
            {done.length}/{tasks.length} complete
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5" /> Task
        </Button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      {showAddForm && <AddTaskForm onDone={() => setShowAddForm(false)} />}

      <div className="flex flex-col gap-4">
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <Flame className="h-3 w-3" /> Yet to do ({pending.length})
          </h3>
          <div className="flex flex-col gap-2">
            {pending.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">
                Nothing queued. Add a task to get started.
              </p>
            ) : (
              pending.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        </section>

        {done.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <Check className="h-3 w-3" /> Done ({done.length})
            </h3>
            <div className="flex flex-col gap-2">
              {done.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Task, TaskPriority, LapBreakdown } from "@/lib/types";

interface NewTaskInput {
  title: string;
  subjectTag: string;
  priority: TaskPriority;
  estimatedMinutes?: number;
}

interface TaskStore {
  tasks: Task[];
  addTask: (input: NewTaskInput) => string;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => void;
  toggleComplete: (id: string) => void;
  addTimeSpent: (id: string, seconds: number) => void;
  attachLapBreakdowns: (id: string, laps: LapBreakdown[]) => void;
  reorder: (orderedIds: string[]) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],

      addTask: (input) => {
        const id = nanoid(10);
        const task: Task = {
          id,
          title: input.title.trim(),
          subjectTag: input.subjectTag.trim() || "General",
          priority: input.priority,
          isCompleted: false,
          estimatedMinutes: input.estimatedMinutes,
          timeSpentSeconds: 0,
          createdAt: Date.now(),
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return id;
      },

      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      toggleComplete: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  isCompleted: !t.isCompleted,
                  completedAt: !t.isCompleted ? Date.now() : undefined,
                }
              : t
          ),
        })),

      addTimeSpent: (id, seconds) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, timeSpentSeconds: t.timeSpentSeconds + seconds }
              : t
          ),
        })),

      attachLapBreakdowns: (id, laps) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  lapBreakdowns: [...(t.lapBreakdowns ?? []), ...laps],
                }
              : t
          ),
        })),

      reorder: (orderedIds) =>
        set((s) => {
          const byId = new Map(s.tasks.map((t) => [t.id, t] as const));
          const reordered = orderedIds
            .map((id) => byId.get(id))
            .filter((t): t is Task => Boolean(t));
          const missing = s.tasks.filter((t) => !orderedIds.includes(t.id));
          return { tasks: [...reordered, ...missing] };
        }),
    }),
    {
      name: "focusengine.tasks.v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

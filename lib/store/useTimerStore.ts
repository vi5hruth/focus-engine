import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  TimerSessionState,
  TimerMode,
  PomodoroConfig,
  LapBreakdown,
} from "@/lib/types";

const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialState(): TimerSessionState {
  return {
    mode: "chronograph",
    status: "idle",
    segmentStartedAt: null,
    accumulatedMs: 0,
    activeTaskId: null,
    laps: [],
    pomodoro: {
      phase: "focus",
      cycleCount: 0,
      config: DEFAULT_POMODORO_CONFIG,
      phaseTargetMs: DEFAULT_POMODORO_CONFIG.focusMinutes * 60_000,
    },
    dailyStudySeconds: {},
    streakDays: 0,
    lastActiveDate: null,
  };
}

interface TimerStore extends TimerSessionState {
  soundEnabled: boolean;
  ambientTrack: "none" | "pink" | "brown" | "drone";

  // derived helpers (pure, take `now` explicitly — never read Date.now()
  // internally so components stay render-pure and testable)
  getElapsedMs: (now: number) => number;
  getPhaseRemainingMs: (now: number) => number;

  start: (now: number) => void;
  pause: (now: number) => void;
  toggle: (now: number) => void;
  reset: () => void;
  split: (now: number, label: string) => void;
  setMode: (mode: TimerMode) => void;
  setActiveTask: (taskId: string | null) => void;
  configurePomodoro: (config: Partial<PomodoroConfig>) => void;
  advancePomodoroPhase: () => void;
  /** called every worker tick; only mutates volatile-but-necessary fields */
  registerCompletionCredit: (now: number, seconds: number) => void;
  toggleSound: () => void;
  setAmbientTrack: (track: "none" | "pink" | "brown" | "drone") => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      ...initialState(),
      soundEnabled: true,
      ambientTrack: "none",

      getElapsedMs: (now) => {
        const s = get();
        if (s.status === "running" && s.segmentStartedAt !== null) {
          return s.accumulatedMs + Math.max(0, now - s.segmentStartedAt);
        }
        return s.accumulatedMs;
      },

      getPhaseRemainingMs: (now) => {
        const s = get();
        const elapsed = s.getElapsedMs(now);
        return Math.max(0, s.pomodoro.phaseTargetMs - elapsed);
      },

      start: (now) =>
        set((s) => {
          if (s.status === "running") return s;
          const today = todayKey();
          let streakDays = s.streakDays;
          if (s.lastActiveDate !== today) {
            const yesterday = new Date(Date.now() - 86_400_000)
              .toISOString()
              .slice(0, 10);
            streakDays = s.lastActiveDate === yesterday ? streakDays + 1 : 1;
          }
          return {
            status: "running",
            segmentStartedAt: now,
            lastActiveDate: today,
            streakDays,
          };
        }),

      pause: (now) =>
        set((s) => {
          if (s.status !== "running" || s.segmentStartedAt === null) return s;
          const elapsedThisSegment = Math.max(0, now - s.segmentStartedAt);
          const today = todayKey();
          const dailyStudySeconds = { ...s.dailyStudySeconds };
          dailyStudySeconds[today] =
            (dailyStudySeconds[today] ?? 0) + elapsedThisSegment / 1000;
          return {
            status: "paused",
            segmentStartedAt: null,
            accumulatedMs: s.accumulatedMs + elapsedThisSegment,
            dailyStudySeconds,
          };
        }),

      toggle: (now) => {
        const s = get();
        if (s.status === "running") s.pause(now);
        else s.start(now);
      },

      reset: () =>
        set((s) => ({
          ...initialState(),
          // preserve cross-session stats & preferences
          dailyStudySeconds: s.dailyStudySeconds,
          streakDays: s.streakDays,
          lastActiveDate: s.lastActiveDate,
          pomodoro: {
            ...initialState().pomodoro,
            config: s.pomodoro.config,
          },
        })),

      split: (now, label) =>
        set((s) => {
          const elapsedMs = s.getElapsedMs(now);
          const priorLapsMs = s.laps.reduce(
            (sum, l) => sum + l.durationSeconds * 1000,
            0
          );
          const lap: LapBreakdown = {
            id: nanoid(8),
            label,
            durationSeconds: Math.max(0, elapsedMs - priorLapsMs) / 1000,
            recordedAt: now,
          };
          return { laps: [...s.laps, lap] };
        }),

      setMode: (mode) =>
        set((s) => ({
          mode,
          pomodoro:
            mode === "pomodoro"
              ? {
                  ...s.pomodoro,
                  phaseTargetMs: s.pomodoro.config.focusMinutes * 60_000,
                }
              : s.pomodoro,
        })),

      setActiveTask: (taskId) => set({ activeTaskId: taskId }),

      configurePomodoro: (config) =>
        set((s) => {
          const merged = { ...s.pomodoro.config, ...config };
          return {
            pomodoro: {
              ...s.pomodoro,
              config: merged,
              phaseTargetMs:
                s.pomodoro.phase === "focus"
                  ? merged.focusMinutes * 60_000
                  : s.pomodoro.phase === "shortBreak"
                    ? merged.breakMinutes * 60_000
                    : merged.longBreakMinutes * 60_000,
            },
          };
        }),

      advancePomodoroPhase: () =>
        set((s) => {
          const cfg = s.pomodoro.config;
          let phase = s.pomodoro.phase;
          let cycleCount = s.pomodoro.cycleCount;

          if (phase === "focus") {
            cycleCount += 1;
            phase =
              cycleCount % cfg.cyclesBeforeLongBreak === 0
                ? "longBreak"
                : "shortBreak";
          } else {
            phase = "focus";
          }

          const phaseTargetMs =
            phase === "focus"
              ? cfg.focusMinutes * 60_000
              : phase === "shortBreak"
                ? cfg.breakMinutes * 60_000
                : cfg.longBreakMinutes * 60_000;

          return {
            status: "idle",
            segmentStartedAt: null,
            accumulatedMs: 0,
            pomodoro: { ...s.pomodoro, phase, cycleCount, phaseTargetMs },
          };
        }),

      registerCompletionCredit: (now, seconds) =>
        set((s) => {
          const today = todayKey();
          const dailyStudySeconds = { ...s.dailyStudySeconds };
          dailyStudySeconds[today] = (dailyStudySeconds[today] ?? 0) + seconds;
          return { dailyStudySeconds };
        }),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setAmbientTrack: (track) => set({ ambientTrack: track }),
    }),
    {
      name: "focusengine.timer.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        mode: s.mode,
        status: s.status,
        segmentStartedAt: s.segmentStartedAt,
        accumulatedMs: s.accumulatedMs,
        activeTaskId: s.activeTaskId,
        laps: s.laps,
        pomodoro: s.pomodoro,
        dailyStudySeconds: s.dailyStudySeconds,
        streakDays: s.streakDays,
        lastActiveDate: s.lastActiveDate,
        soundEnabled: s.soundEnabled,
        ambientTrack: s.ambientTrack,
      }),
      onRehydrateStorage: () => (state) => {
        // If the tab was closed mid-run, convert the dangling running
        // segment into paused accumulation using wall-clock now, so we
        // never silently "lose" or over-count time on reload.
        if (state && state.status === "running" && state.segmentStartedAt) {
          const now = Date.now();
          const elapsed = Math.max(0, now - state.segmentStartedAt);
          state.accumulatedMs += elapsed;
          state.status = "paused";
          state.segmentStartedAt = null;
        }
      },
    }
  )
);

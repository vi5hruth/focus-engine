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

/**
 * Returns YYYY-MM-DD in the user's LOCAL timezone, avoiding UTC boundary glitches.
 */
function getLocalDateKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates if yesterday was the previous active day in local calendar time.
 */
/**
 * Calculates if yesterday was the previous active day in local calendar time.
 */
function isConsecutiveDay(lastDateStr: string | null, todayStr: string): boolean {
  if (!lastDateStr) return false;

  const lastParts = lastDateStr.split("-").map(Number);
  const todayParts = todayStr.split("-").map(Number);

  if (lastParts.length !== 3 || todayParts.length !== 3) return false;

  const [ly, lm, ld] = lastParts as [number, number, number];
  const [ty, tm, td] = todayParts as [number, number, number];

  const lastDate = new Date(ly, lm - 1, ld);
  const today = new Date(ty, tm - 1, td);

  const diffMs = today.getTime() - lastDate.getTime();
  const oneDayMs = 86_400_000;

  // Account for daylight saving variance (23-25 hours)
  return diffMs >= oneDayMs - 3_600_000 && diffMs <= oneDayMs + 3_600_000;
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
          const today = getLocalDateKey();
          let streakDays = s.streakDays;

          if (s.lastActiveDate !== today) {
            streakDays = isConsecutiveDay(s.lastActiveDate, today)
              ? streakDays + 1
              : 1;
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
          const today = getLocalDateKey();

          const dailyStudySeconds = { ...s.dailyStudySeconds };
          // Only credit study seconds if in focus phase or chronograph mode
          if (s.mode === "chronograph" || s.pomodoro.phase === "focus") {
            dailyStudySeconds[today] =
              (dailyStudySeconds[today] ?? 0) + elapsedThisSegment / 1000;
          }

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
          dailyStudySeconds: s.dailyStudySeconds,
          streakDays: s.streakDays,
          lastActiveDate: s.lastActiveDate,
          pomodoro: {
            ...initialState().pomodoro,
            config: s.pomodoro.config,
            phaseTargetMs: s.pomodoro.config.focusMinutes * 60_000,
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
          status: "idle",
          segmentStartedAt: null,
          accumulatedMs: 0,
          pomodoro:
            mode === "pomodoro"
              ? {
                  ...s.pomodoro,
                  phase: "focus",
                  phaseTargetMs: s.pomodoro.config.focusMinutes * 60_000,
                }
              : s.pomodoro,
        })),

      setActiveTask: (taskId) => set({ activeTaskId: taskId }),

      configurePomodoro: (config) =>
        set((s) => {
          const merged = { ...s.pomodoro.config, ...config };
          const phaseTargetMs =
            s.pomodoro.phase === "focus"
              ? merged.focusMinutes * 60_000
              : s.pomodoro.phase === "shortBreak"
                ? merged.breakMinutes * 60_000
                : merged.longBreakMinutes * 60_000;

          return {
            pomodoro: {
              ...s.pomodoro,
              config: merged,
              phaseTargetMs,
            },
          };
        }),

      advancePomodoroPhase: () =>
        set((s) => {
          const now = Date.now();
          const cfg = s.pomodoro.config;
          let phase = s.pomodoro.phase;
          let cycleCount = s.pomodoro.cycleCount;

          // Commit final running segment before resetting
          const finalSegmentMs =
            s.status === "running" && s.segmentStartedAt !== null
              ? Math.max(0, now - s.segmentStartedAt)
              : 0;

          const dailyStudySeconds = { ...s.dailyStudySeconds };
          if (phase === "focus" && finalSegmentMs > 0) {
            const today = getLocalDateKey();
            dailyStudySeconds[today] =
              (dailyStudySeconds[today] ?? 0) + finalSegmentMs / 1000;
          }

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
            dailyStudySeconds,
            pomodoro: { ...s.pomodoro, phase, cycleCount, phaseTargetMs },
          };
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
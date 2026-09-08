// ─────────────────────────────────────────────────────────────────────────
// FocusEngine — Domain Contracts
// Every cross-module data shape lives here so the store, worker, and UI
// layers all compile against a single source of truth.
// ─────────────────────────────────────────────────────────────────────────

export type TaskPriority = "low" | "medium" | "high";

export interface LapBreakdown {
  id: string;
  label: string;
  durationSeconds: number;
  recordedAt: number; // epoch ms
}

export interface Task {
  id: string;
  title: string;
  subjectTag: string; // e.g. 'Algorithms', 'System Design', 'Math'
  priority: TaskPriority;
  isCompleted: boolean;
  estimatedMinutes?: number;
  timeSpentSeconds: number;
  createdAt: number;
  completedAt?: number;
  lapBreakdowns?: LapBreakdown[];
}

export type TimerMode = "chronograph" | "pomodoro";

export type TimerStatus = "idle" | "running" | "paused" | "completed";

export type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

export interface PomodoroConfig {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

/**
 * Persisted, serializable timer session state. This is the single object
 * that is written to localStorage on every tick so a reload can rehydrate
 * an in-progress session without losing accuracy.
 */
export interface TimerSessionState {
  mode: TimerMode;
  status: TimerStatus;
  /** epoch ms when the current run segment started (null when paused/idle) */
  segmentStartedAt: number | null;
  /** accumulated elapsed ms from all previous completed segments this session */
  accumulatedMs: number;
  /** the task currently tethered to this session, if any */
  activeTaskId: string | null;
  laps: LapBreakdown[];
  pomodoro: {
    phase: PomodoroPhase;
    cycleCount: number;
    config: PomodoroConfig;
    /** target duration of the current phase, in ms */
    phaseTargetMs: number;
  };
  dailyStudySeconds: Record<string, number>; // keyed by YYYY-MM-DD
  streakDays: number;
  lastActiveDate: string | null; // YYYY-MM-DD
}

// ── Web Worker protocol ─────────────────────────────────────────────────

export type WorkerCommand =
  | { type: "START"; payload: { epoch: number } }
  | { type: "STOP" }
  | { type: "SYNC"; payload: { epoch: number } };

export type WorkerEvent = { type: "TICK"; payload: { now: number } };

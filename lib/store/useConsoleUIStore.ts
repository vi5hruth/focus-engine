import { create } from "zustand";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { audioEngine } from "@/lib/audio/audioEngine";

export const SPLIT_PRESETS = ["Deep Reading", "Problem Set", "Debugging", "Review"] as const;

/**
 * Thin, non-persisted controller so the global keyboard shortcuts (Space /
 * S / R) and the on-screen buttons in <TimerConsole> drive the exact same
 * code path — no duplicated "what does Space do" logic between a key
 * listener and a click handler.
 */
interface ConsoleUIStore {
  splitLabel: string;
  showResetConfirm: boolean;
  setSplitLabel: (label: string) => void;
  performToggle: () => void;
  performSplit: () => void;
  requestReset: () => void;
  cancelReset: () => void;
  confirmReset: () => void;
}

export const useConsoleUIStore = create<ConsoleUIStore>((set, get) => ({
  splitLabel: SPLIT_PRESETS[0],
  showResetConfirm: false,

  setSplitLabel: (label) => set({ splitLabel: label }),

  performToggle: () => {
    useTimerStore.getState().toggle(Date.now());
  },

  performSplit: () => {
    const timer = useTimerStore.getState();
    if (timer.mode !== "chronograph" || timer.status !== "running") return;
    timer.split(Date.now(), get().splitLabel);
    if (timer.soundEnabled) audioEngine.playTick();
  },

  requestReset: () => set({ showResetConfirm: true }),
  cancelReset: () => set({ showResetConfirm: false }),
  confirmReset: () => {
    useTimerStore.getState().reset();
    set({ showResetConfirm: false });
  },
}));

import { create } from "zustand";

/**
 * Deliberately NOT persisted and NOT combined with useTimerStore.
 * The worker posts a tick ~10x/sec; if that tick touched the persisted
 * timer store directly, zustand's `persist` middleware would serialize the
 * full session to localStorage every 100ms for the entire session. Instead
 * this store just republishes wall-clock `now`, and components derive
 * elapsed/remaining time from `useTimerStore.getElapsedMs(now)`.
 */
interface ClockStore {
  now: number;
  setNow: (now: number) => void;
}

export const useClockStore = create<ClockStore>((set) => ({
  now: Date.now(),
  setNow: (now) => set({ now }),
}));

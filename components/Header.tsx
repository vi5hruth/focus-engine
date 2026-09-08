"use client";

import { useEffect, useState } from "react";
import { Flame, Volume2, VolumeX, Keyboard, Command, Waves } from "lucide-react";
import { useTimerStore } from "@/lib/store/useTimerStore";
import { Button } from "@/components/ui/button";
import { audioEngine } from "@/lib/audio/audioEngine";
import { formatMinutesLabel, todayKey } from "@/lib/utils";

export function Header({
  onShowCheatSheet,
  onShowCommandPalette,
}: {
  onShowCheatSheet: () => void;
  onShowCommandPalette: () => void;
}) {
  const streakDays = useTimerStore((s) => s.streakDays);
  const dailyStudySeconds = useTimerStore((s) => s.dailyStudySeconds);
  const soundEnabled = useTimerStore((s) => s.soundEnabled);
  const ambientTrack = useTimerStore((s) => s.ambientTrack);
  const toggleSound = useTimerStore((s) => s.toggleSound);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const todaySeconds = dailyStudySeconds[todayKey()] ?? 0;

  function handleSoundToggle() {
    toggleSound();
    if (soundEnabled) {
      audioEngine.stopAmbient();
    } else if (ambientTrack !== "none") {
      audioEngine.setAmbient(ambientTrack);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Waves className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            FocusEngine
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <div className="hidden items-center gap-1.5 sm:flex">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono tabular-nums text-zinc-200">{streakDays}</span>
            <span className="text-zinc-600">day streak</span>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="text-zinc-600">Today</span>
            <span className="font-mono tabular-nums text-zinc-200">
              {mounted ? formatMinutesLabel(todaySeconds) : "0m"}
            </span>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleSoundToggle}
            aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
            title={soundEnabled ? "Mute sound" : "Unmute sound"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={onShowCommandPalette}
            aria-label="Open command palette"
            title="Command palette (Cmd+K)"
          >
            <Command className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={onShowCheatSheet}
            aria-label="Show keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

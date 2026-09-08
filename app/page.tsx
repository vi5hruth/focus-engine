"use client";

import { useCallback, useState } from "react";
import { TimerEngineProvider } from "@/components/TimerEngineProvider";
import { Header } from "@/components/Header";
import { TimerConsole } from "@/components/TimerConsole";
import { TaskBoard } from "@/components/TaskBoard";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutSheet } from "@/components/ShortcutSheet";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useConsoleUIStore } from "@/lib/store/useConsoleUIStore";

export default function Home() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);

  const performToggle = useConsoleUIStore((s) => s.performToggle);
  const performSplit = useConsoleUIStore((s) => s.performSplit);
  const requestReset = useConsoleUIStore((s) => s.requestReset);

  const handleCommandPalette = useCallback(() => setPaletteOpen((v) => !v), []);
  const handleCheatSheet = useCallback(() => setCheatSheetOpen(true), []);

  useKeyboardShortcuts({
    onToggle: performToggle,
    onSplit: performSplit,
    onReset: requestReset,
    onCommandPalette: handleCommandPalette,
    onShowCheatSheet: handleCheatSheet,
  });

  return (
    <TimerEngineProvider>
      <Header
        onShowCheatSheet={() => setCheatSheetOpen(true)}
        onShowCommandPalette={() => setPaletteOpen(true)}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <TimerConsole />
        <TaskBoard />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-[11px] text-zinc-700 sm:px-6">
        Press <kbd className="rounded border border-zinc-800 px-1 py-0.5">?</kbd> for shortcuts · runs entirely offline once loaded
      </footer>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutSheet open={cheatSheetOpen} onOpenChange={setCheatSheetOpen} />
    </TimerEngineProvider>
  );
}

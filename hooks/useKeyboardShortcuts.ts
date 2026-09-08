"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onToggle: () => void;
  onSplit: () => void;
  onReset: () => void;
  onCommandPalette: () => void;
  onShowCheatSheet: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

export function useKeyboardShortcuts({
  onToggle,
  onSplit,
  onReset,
  onCommandPalette,
  onShowCheatSheet,
}: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (cmdK) {
        e.preventDefault();
        onCommandPalette();
        return;
      }

      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          onToggle();
          break;
        case "s":
        case "S":
          e.preventDefault();
          onSplit();
          break;
        case "r":
        case "R":
          e.preventDefault();
          onReset();
          break;
        case "?":
          e.preventDefault();
          onShowCheatSheet();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle, onSplit, onReset, onCommandPalette, onShowCheatSheet]);
}

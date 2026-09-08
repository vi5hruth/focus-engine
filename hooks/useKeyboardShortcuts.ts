"use client";

import { useEffect, useRef } from "react";

interface ShortcutHandlers {
  onToggle: () => void;
  onSplit: () => void;
  onReset: () => void;
  onCommandPalette: () => void;
  onShowCheatSheet: () => void;
}

/**
 * Robust check for active editable contexts, including custom ARIA textboxes
 */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role");

  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable ||
    role === "textbox" ||
    role === "searchbox" ||
    role === "combobox"
  );
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Store handlers in a ref to decouple listener lifecycle from render closures
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 1. Ignore repeated keydowns from holding a key
      if (e.repeat) return;

      const isModifierActive = e.metaKey || e.ctrlKey || e.altKey;

      // 2. Global Command Palette: Cmd+K / Ctrl+K (allowed even inside inputs)
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlersRef.current.onCommandPalette();
        return;
      }

      // 3. Escape all normal shortcuts if the user is typing into an input
      if (isTypingTarget(e.target)) return;

      // 4. Protect browser native combos (Cmd+R refresh, Cmd+S save, etc.)
      if (isModifierActive) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlersRef.current.onToggle();
          break;

        case "s":
        case "S":
          e.preventDefault();
          handlersRef.current.onSplit();
          break;

        case "r":
        case "R":
          e.preventDefault();
          handlersRef.current.onReset();
          break;

        case "?":
          e.preventDefault();
          handlersRef.current.onShowCheatSheet();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // Mounts strictly once; zero listener thrashing
}
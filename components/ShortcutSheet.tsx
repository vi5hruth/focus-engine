"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ["Space"], description: "Start / pause the active timer" },
  { keys: ["S"], description: "Split — record a lap on the chronograph" },
  { keys: ["R"], description: "Reset the session (asks for confirmation)" },
  { keys: ["⌘", "K"], description: "Open the command palette" },
  { keys: ["?"], description: "Show this cheat sheet" },
];

export function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            FocusEngine is built keyboard-first — these work anywhere outside a text field.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col divide-y divide-zinc-900">
          {SHORTCUTS.map((s) => (
            <div key={s.description} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-zinc-300">{s.description}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-[1.75rem] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-center font-mono text-xs text-zinc-300"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

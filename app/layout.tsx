import type { Metadata } from "next";
import "./globals.css";

// Deliberately NOT next/font/google: FocusEngine is offline-first, and a
// build-time fetch to fonts.googleapis.com is a network dependency that
// contradicts that goal (it also breaks builds in network-restricted CI
// environments). --font-mono / --font-sans resolve to curated system-font
// stacks defined in globals.css, so there is zero external asset fetch at
// build OR run time, while still keeping tabular-figure monospace digits.
export const metadata: Metadata = {
  title: "FocusEngine — Study Chronograph & Task Execution",
  description:
    "A drift-free, offline-first study chronograph with Pomodoro intervals and task time tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}

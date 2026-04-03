"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm text-muted transition hover:border-accent/50 hover:text-text"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white/50 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}

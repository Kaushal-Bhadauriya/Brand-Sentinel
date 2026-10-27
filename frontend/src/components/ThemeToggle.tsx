"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read persisted theme or default to dark
    const stored = localStorage.getItem("theme");
    const initialTheme = stored === "light" ? "light" : "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return (
      <div className="w-7 h-7 rounded-md border border-slate-200 dark:border-zinc-800" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <Sun className="w-3.5 h-3.5 text-zinc-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-slate-600 hover:text-indigo-600 transition-colors" />
      )}
    </button>
  );
};

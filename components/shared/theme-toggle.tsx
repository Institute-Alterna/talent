"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
        <button className="rounded-md p-1.5" disabled>
          <Sun className="h-4 w-4" />
        </button>
        <button className="rounded-md p-1.5" disabled>
          <Monitor className="h-4 w-4" />
        </button>
        <button className="rounded-md p-1.5" disabled>
          <Moon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
      <button
        onClick={() => setTheme("light")}
        className={`rounded-md p-1.5 transition-colors ${
          theme === "light"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Light mode"
        title="Light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`rounded-md p-1.5 transition-colors ${
          theme === "system"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="System mode"
        title="System mode"
      >
        <Monitor className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`rounded-md p-1.5 transition-colors ${
          theme === "dark"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}

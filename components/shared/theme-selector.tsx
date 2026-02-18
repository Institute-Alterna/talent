"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { strings } from "@/config/strings";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {["light", "system", "dark"].map((t) => (
          <div
            key={t}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-border bg-card p-6 text-center"
          >
            <div className="rounded-full bg-muted p-4">
              {t === "light" && <Sun className="h-6 w-6" />}
              {t === "system" && <Monitor className="h-6 w-6" />}
              {t === "dark" && <Moon className="h-6 w-6" />}
            </div>
            <div>
              <div className="font-medium capitalize">{t}</div>
              <div className="text-xs text-muted-foreground">Loading...</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const themes = [
    {
      value: "light",
      icon: Sun,
      label: strings.settings?.themeLight || "Light",
      subtitle: "Bright and clean",
    },
    {
      value: "system",
      icon: Monitor,
      label: strings.settings?.themeSystem || "System",
      subtitle: "Match your OS",
    },
    {
      value: "dark",
      icon: Moon,
      label: strings.settings?.themeDark || "Dark",
      subtitle: "Easy on the eyes",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {themes.map(({ value, icon: Icon, label, subtitle }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 p-6 text-center transition-all ${
            theme === value
              ? "border-primary bg-primary/5 ring-2 ring-primary"
              : "border-border bg-card hover:border-primary/50 hover:bg-accent"
          }`}
        >
          <div
            className={`rounded-full p-4 transition-colors ${
              theme === value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

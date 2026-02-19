"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { strings } from "@/config/strings";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {["light", "system", "dark"].map((t) => (
          <div
            key={t}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 text-center"
          >
            <div className="rounded-full bg-muted p-3">
              {t === "light" && <Sun className="h-5 w-5" />}
              {t === "system" && <Monitor className="h-5 w-5" />}
              {t === "dark" && <Moon className="h-5 w-5" />}
            </div>
            <div className="text-sm font-medium capitalize">{t}</div>
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
    },
    {
      value: "system",
      icon: Monitor,
      label: strings.settings?.themeSystem || "System",
    },
    {
      value: "dark",
      icon: Moon,
      label: strings.settings?.themeDark || "Dark",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-all ${
            theme === value
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border bg-card hover:border-primary/50 hover:bg-accent"
          }`}
        >
          <div
            className={`rounded-full p-3 transition-colors ${
              theme === value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium">{label}</div>
        </button>
      ))}
    </div>
  );
}

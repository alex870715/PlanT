"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyColorTheme,
  COLOR_THEMES,
  getColorTheme,
  readStoredColorTheme,
  type ColorThemeId,
} from "@/lib/color-themes";
import { cn } from "@/lib/utils";

export function ColorThemeMenu() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<ColorThemeId>(() =>
    readStoredColorTheme()
  );

  useEffect(() => {
    applyColorTheme(activeId);
  }, [activeId]);

  const active = getColorTheme(activeId);

  function selectTheme(id: ColorThemeId) {
    setActiveId(id);
    applyColorTheme(id);
  }

  return (
    <div className="fixed left-3 top-3 z-[100] sm:left-4 sm:top-4">
      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-emerald-200/80 bg-white/90 shadow-md backdrop-blur hover:bg-emerald-50/80"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="頁面配色設定"
        >
          <Palette className="h-4 w-4 text-emerald-600" />
          <span className="hidden text-xs font-medium text-emerald-950 sm:inline">
            頁面設定
          </span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-emerald-600" />
          )}
        </Button>

        {open && (
          <div
            className="w-[min(calc(100vw-1.5rem),18rem)] rounded-xl border border-emerald-200/80 bg-white/95 p-3 shadow-lg backdrop-blur"
            role="dialog"
            aria-label="選擇頁面配色"
          >
            <p className="mb-1 text-xs font-semibold text-emerald-950">
              頁面配色
            </p>
            <p className="mb-3 text-[10px] leading-relaxed text-emerald-800/80">
              7 組依色彩學搭配的預設主題，會套用到整個 PlanT 介面。
            </p>

            <ul className="space-y-1.5">
              {COLOR_THEMES.map((theme) => {
                const selected = theme.id === activeId;
                return (
                  <li key={theme.id}>
                    <button
                      type="button"
                      onClick={() => selectTheme(theme.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        selected
                          ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300/60"
                          : "border-emerald-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
                      )}
                    >
                      <span className="mt-0.5 flex shrink-0 gap-0.5">
                        {theme.swatches.map((color) => (
                          <span
                            key={color}
                            className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: color }}
                            aria-hidden
                          />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-950">
                          {theme.name}
                          {selected && (
                            <Check className="h-3 w-3 text-emerald-600" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-emerald-800/75">
                          {theme.theory}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mt-2 border-t border-emerald-100 pt-2 text-[10px] text-emerald-700/70">
              目前：<strong>{active.name}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

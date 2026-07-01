"use client";

import { useCallback, useEffect, useState } from "react";

export type MapThemeColors = {
  trunk: { bg: string; border: string; text: string };
  sprout: { bg: string; border: string; text: string };
  route: { all: string; day: string; focus: string };
};

const FALLBACK: MapThemeColors = {
  trunk: { bg: "#059669", border: "#047857", text: "#ffffff" },
  sprout: { bg: "#ecfccb", border: "#65a30d", text: "#14532d" },
  route: { all: "#059669", day: "#10b981", focus: "#65a30d" },
};

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/** 從頁面配色 CSS 變數讀取地圖用色（與 data-color-theme 同步） */
export function readMapThemeColors(): MapThemeColors {
  return {
    trunk: {
      bg: cssVar("--map-trunk-bg", FALLBACK.trunk.bg),
      border: cssVar("--map-trunk-border", FALLBACK.trunk.border),
      text: cssVar("--map-trunk-text", FALLBACK.trunk.text),
    },
    sprout: {
      bg: cssVar("--map-sprout-bg", FALLBACK.sprout.bg),
      border: cssVar("--map-sprout-border", FALLBACK.sprout.border),
      text: cssVar("--map-sprout-text", FALLBACK.sprout.text),
    },
    route: {
      all: cssVar("--map-route-all", FALLBACK.route.all),
      day: cssVar("--map-route-day", FALLBACK.route.day),
      focus: cssVar("--map-route-focus", FALLBACK.route.focus),
    },
  };
}

export const MAP_THEME_CHANGE_EVENT = "plant-color-theme-change";

/** 切換頁面配色時重新讀取地圖標記色 */
export function useMapThemeColors(): MapThemeColors {
  const [colors, setColors] = useState<MapThemeColors>(FALLBACK);

  const refresh = useCallback(() => {
    setColors(readMapThemeColors());
  }, []);

  useEffect(() => {
    refresh();

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some((m) => m.attributeName === "data-color-theme")
      ) {
        refresh();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-color-theme"],
    });

    window.addEventListener(MAP_THEME_CHANGE_EVENT, refresh);
    return () => {
      observer.disconnect();
      window.removeEventListener(MAP_THEME_CHANGE_EVENT, refresh);
    };
  }, [refresh]);

  return colors;
}

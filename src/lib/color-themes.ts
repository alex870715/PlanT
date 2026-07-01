/** 頁面配色主題（localStorage key） */
export const COLOR_THEME_STORAGE_KEY = "plant-color-theme";

export type ColorThemeId =
  | "forest"
  | "ocean"
  | "sunset"
  | "lavender"
  | "sakura"
  | "midnight"
  | "earth";

export type ColorTheme = {
  id: ColorThemeId;
  name: string;
  /** 色彩學簡述 */
  theory: string;
  /** 預覽色（brand / info / warm） */
  swatches: [string, string, string];
};

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "forest",
    name: "森綠",
    theory: "自然 analogous：綠＋青，旅行生機感",
    swatches: ["#059669", "#0284c7", "#d97706"],
  },
  {
    id: "ocean",
    name: "海藍",
    theory: "冷色 monochromatic：深淺海藍，沉穩清晰",
    swatches: ["#2563eb", "#0891b2", "#ea580c"],
  },
  {
    id: "sunset",
    name: "夕照",
    theory: "暖色 complementary：橙紅主色＋冷青點綴",
    swatches: ["#ea580c", "#0ea5e9", "#ca8a04"],
  },
  {
    id: "lavender",
    name: "薰衣草",
    theory: "split-complementary：紫＋黃綠，柔和夢幻",
    swatches: ["#9333ea", "#6366f1", "#84cc16"],
  },
  {
    id: "sakura",
    name: "櫻語",
    theory: "triadic 柔和版：粉＋青＋暖金",
    swatches: ["#db2777", "#0284c7", "#eab308"],
  },
  {
    id: "midnight",
    name: "午夜",
    theory: "低彩度 cool：靛青主色，夜間質感",
    swatches: ["#4f46e5", "#0369a1", "#b45309"],
  },
  {
    id: "earth",
    name: "大地",
    theory: "earth tones：橄欖綠＋陶土，樸實溫暖",
    swatches: ["#65a30d", "#0d9488", "#c2410c"],
  },
];

export const DEFAULT_COLOR_THEME_ID: ColorThemeId = "forest";

export function isColorThemeId(value: string): value is ColorThemeId {
  return COLOR_THEMES.some((t) => t.id === value);
}

export function getColorTheme(id: ColorThemeId): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

export function applyColorTheme(id: ColorThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-color-theme", id);
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("plant-color-theme-change", { detail: { id } })
    );
  }
}

export function readStoredColorTheme(): ColorThemeId {
  if (typeof window === "undefined") return DEFAULT_COLOR_THEME_ID;
  try {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (stored && isColorThemeId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_COLOR_THEME_ID;
}

/** layout 用：避免主題切換閃爍 */
export function colorThemeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(COLOR_THEME_STORAGE_KEY)};var v=localStorage.getItem(k);var ok=${JSON.stringify(COLOR_THEMES.map((t) => t.id))}.indexOf(v)>=0;if(ok)document.documentElement.setAttribute("data-color-theme",v);}catch(e){}})();`;
}

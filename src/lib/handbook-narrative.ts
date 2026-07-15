import type { HandbookSpotCategory } from "@/lib/trip-handbook";

/** 旅遊手冊實用導覽文案（繁體中文，非童話語氣） */

export function guidePurpose(
  destination: string,
  days: number,
  foodNames: string[],
  sightNames: string[],
  members: string[]
): string {
  const parts: string[] = [
    `${destination} ${days} 天行程手冊，整理這趟的目的、美食、景點、每日路線與交通方式，方便出發前快速掌握。`,
  ];
  if (foodNames.length > 0) {
    parts.push(`美食重點：${foodNames.join("、")}。`);
  }
  if (sightNames.length > 0) {
    parts.push(`景點重點：${sightNames.join("、")}。`);
  }
  if (members.length > 1) {
    parts.push(`同行：${members.join("、")}。`);
  }
  return parts.join("");
}

export function guideFoodIntro(destination: string, count: number): string {
  return `${destination} 美食導覽 — 共 ${count} 站。含推薦理由、區域與用餐提示，出發前可先鎖定想去的口袋名單。`;
}

export function guideSpotIntro(destination: string, count: number): string {
  return `${destination} 景點導覽 — 共 ${count} 站。含簡介、建議停留時間與區域，方便安排每日節奏。`;
}

export function guideFoodNote(
  name: string,
  description: string | null,
  area: string | null
): string {
  const where = area ? `（${area}）` : "";
  const detail = description ?? "適合與旅伴一同前往";
  return `${name}${where}：${detail}。`;
}

export function guideSpotNote(
  name: string,
  description: string | null,
  area: string | null
): string {
  const where = area ? `（${area}）` : "";
  const detail = description ?? "建議預留時間參觀與拍照";
  return `${name}${where}：${detail}。`;
}

export function guideLodgingNote(
  name: string,
  description: string | null,
  area: string | null
): string {
  const where = area ? `（${area}）` : "";
  const detail = description ?? "今日出發與返程的住宿基地";
  return `${name}${where}：${detail}。`;
}

export function guideMustTry(
  name: string,
  category: HandbookSpotCategory
): string | null {
  if (category !== "food") return null;
  if (name.includes("市場") || name.includes("海鮮")) return "現挑海鮮、當日漁獲";
  if (name.includes("拉麵") || name.includes("麵")) return "招牌湯頭與麵款";
  if (name.includes("烤肉") || name.includes("五花")) return "厚切五花、包生菜蒜片";
  if (name.includes("咖啡")) return "手沖或招牌飲品";
  return "店內招牌或當地人氣品項";
}

export function guideStayTip(description: string | null): string {
  if (description?.includes("夜景")) return "建議停留 1～1.5 小時 · 傍晚至夜間最佳";
  if (description?.includes("海") || description?.includes("沙灘"))
    return "建議停留 1～2 小時";
  if (description?.includes("文化") || description?.includes("村"))
    return "建議停留 1.5～2 小時";
  return "建議停留約 1～1.5 小時";
}

export function guideRouteSummary(
  dayIndex: number,
  spotNames: string[],
  lodgingName?: string | null
): string {
  if (lodgingName) {
    const middle =
      spotNames.length > 0 ? spotNames.join(" → ") : "自由安排";
    return `第 ${dayIndex} 日：${lodgingName} → ${middle} → ${lodgingName}。`;
  }
  if (spotNames.length === 0) return `第 ${dayIndex} 日路線待安排。`;
  if (spotNames.length === 1) return `第 ${dayIndex} 日：${spotNames[0]}。`;
  return `第 ${dayIndex} 日路線：${spotNames.join(" → ")}。`;
}

export function guideTransportSummary(
  destination: string,
  primaryMode: string,
  totalMinutes: number
): string {
  return `${destination} 主線以${primaryMode}為主，預估移動時間約 ${totalMinutes} 分鐘。各段詳情見下方標示。`;
}

export function guideClosing(destination: string): string {
  return `分享 Seed 碼給旅伴，即可檢視這趟 ${destination} 手冊並一起編輯行程。`;
}

/** @deprecated 保留舊名稱相容 */
export const fairyTalePurpose = guidePurpose;
export const fairyTaleFoodIntro = guideFoodIntro;
export const fairyTaleSpotIntro = guideSpotIntro;
export const fairyTaleFoodGuideNote = guideFoodNote;
export const fairyTaleSpotGuideNote = guideSpotNote;
export const fairyTaleMustTry = guideMustTry;
export const fairyTaleStayTip = guideStayTip;
export const fairyTaleRouteNarrative = guideRouteSummary;
export const fairyTaleTransportSummary = guideTransportSummary;
export const fairyTaleClosing = guideClosing;

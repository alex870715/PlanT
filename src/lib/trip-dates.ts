/** YYYY-MM-DD for <input type="date" /> */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** datetime-local 預設：3 天後 23:59 */
export function getDefaultVotingDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(23, 59, 0, 0);
  return toDateTimeLocalValue(d);
}

export function toDateTimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function parseDateTimeLocal(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);
  if (trimmed.includes("T")) {
    const [datePart, timePart] = trimmed.split("T");
    const [y, mo, da] = datePart.split("-").map(Number);
    const [hh, mm] = (timePart ?? "23:59").split(":").map(Number);
    return new Date(y, mo - 1, da, hh ?? 0, mm ?? 0, 0, 0);
  }
  const day = parseDateInput(trimmed);
  day.setHours(23, 59, 0, 0);
  return day;
}

export function validateVotingDeadline(value: string): string | null {
  if (!value.trim()) return "請設定投票截止時間";
  const ends = parseDateTimeLocal(value);
  if (isNaN(ends.getTime())) return "截止時間格式無效";
  if (ends.getTime() <= Date.now()) return "截止時間必須晚於現在";
  return null;
}

export function getDefaultTripDateRange(): { start: string; end: string } {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

export function validateTripDateRange(
  start: string,
  end: string
): string | null {
  if (!start || !end) return "請選擇出發與回程日期";
  const startMs = parseDateInput(start).getTime();
  const endMs = parseDateInput(end).getTime();
  if (isNaN(startMs) || isNaN(endMs)) return "日期格式無效";
  if (endMs < startMs) return "回程日不可早於出發日";
  return null;
}

/** 解析 YYYY-MM-DD 或 ISO 字串（取前 10 碼當本地曆日，避免時區偏移） */
export function parseDateInput(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);

  const ymd =
    trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)
      ? trimmed.slice(0, 10)
      : trimmed;

  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function tripRangeToIso(start: string, end: string): {
  startDate: string;
  endDate: string;
} {
  const startDate = parseDateInput(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = parseDateInput(end);
  endDate.setHours(23, 59, 59, 999);
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/** Inclusive calendar days between start and end (local midnight). */
export function tripDayCount(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.max(
    1,
    Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
  );
}

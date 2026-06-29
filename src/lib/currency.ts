export type CurrencyMeta = {
  code: string;
  label: string;
  symbol: string;
  /** 小數位數：JPY/KRW 為 0 */
  decimals: number;
};

export const CURRENCIES: CurrencyMeta[] = [
  { code: "TWD", label: "新台幣", symbol: "NT$", decimals: 0 },
  { code: "JPY", label: "日圓", symbol: "¥", decimals: 0 },
  { code: "KRW", label: "韓元", symbol: "₩", decimals: 0 },
  { code: "USD", label: "美元", symbol: "$", decimals: 2 },
  { code: "EUR", label: "歐元", symbol: "€", decimals: 2 },
  { code: "HKD", label: "港幣", symbol: "HK$", decimals: 2 },
  { code: "CNY", label: "人民幣", symbol: "¥", decimals: 2 },
  { code: "THB", label: "泰銖", symbol: "฿", decimals: 2 },
  { code: "SGD", label: "新加坡幣", symbol: "S$", decimals: 2 },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export const DEFAULT_CURRENCY = "TWD";

export function getCurrencyMeta(code: string | null | undefined): CurrencyMeta {
  return BY_CODE.get((code ?? "").toUpperCase()) ?? BY_CODE.get(DEFAULT_CURRENCY)!;
}

export function isSupportedCurrency(code: string): boolean {
  return BY_CODE.has(code.toUpperCase());
}

/** 依目的地 slug 推測常用幣別 */
export function inferCurrencyFromDestination(
  slug: string | null | undefined
): string {
  switch ((slug ?? "").toLowerCase()) {
    case "tokyo":
    case "osaka":
    case "fukuoka":
      return "JPY";
    case "seoul":
    case "busan":
      return "KRW";
    case "taipei":
      return "TWD";
    default:
      return DEFAULT_CURRENCY;
  }
}

/** 依幣別小數位數四捨五入 */
export function roundMoney(amount: number, currency: string): number {
  const { decimals } = getCurrencyMeta(currency);
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

/** 格式化金額顯示（含符號、千分位、正確小數位） */
export function formatMoney(amount: number, currency: string): string {
  const meta = getCurrencyMeta(currency);
  const value = roundMoney(amount, currency);
  try {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(value);
  } catch {
    const fixed = value.toFixed(meta.decimals);
    return `${meta.symbol}${fixed}`;
  }
}

/** 僅主幹／成員，相容尚未 db:push 的舊資料庫 */
export const tripMinimalInclude = {
  spots: { include: { member: true }, orderBy: { sortOrder: "asc" as const } },
  members: true,
};

/** 不含記帳，相容舊版 Prisma Client */
export const tripCoreInclude = {
  ...tripMinimalInclude,
  tasks: { orderBy: { sortOrder: "asc" as const } },
};

/** 統一 Trip 查詢關聯，避免各 API 漏 include */
export const tripDetailInclude = {
  ...tripCoreInclude,
  expenses: {
    include: { paidBy: true },
    orderBy: { createdAt: "desc" as const },
  },
};

export const tripIncludeFallbacks = [
  tripDetailInclude,
  tripCoreInclude,
  tripMinimalInclude,
] as const;

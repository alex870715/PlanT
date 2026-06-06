/** 不含記帳，相容舊版 Prisma Client */
export const tripCoreInclude = {
  spots: { include: { member: true }, orderBy: { sortOrder: "asc" as const } },
  members: true,
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

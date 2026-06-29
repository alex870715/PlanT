/** 僅主幹／成員，相容尚未 db:push 的舊資料庫 */
export const tripMinimalInclude = {
  spots: { include: { member: true }, orderBy: { sortOrder: "asc" as const } },
  members: true,
};

/** 不含記帳，相容舊版 Prisma Client */
export const tripCoreInclude = {
  ...tripMinimalInclude,
  tasks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      attachments: { orderBy: { createdAt: "asc" as const } },
      confirmations: { orderBy: { createdAt: "asc" as const } },
    },
  },
};

/** 任務不含附件（相容尚未建立 TripTaskAttachment 表的資料庫） */
export const tripTasksPlainInclude = {
  ...tripMinimalInclude,
  tasks: { orderBy: { sortOrder: "asc" as const } },
};

/** 含記帳、任務不含附件（相容尚未建立 TripTaskAttachment 表） */
export const tripExpensePlainInclude = {
  ...tripTasksPlainInclude,
  expenses: {
    include: { paidBy: true },
    orderBy: { createdAt: "desc" as const },
  },
};

const tripActivityInclude = {
  activities: {
    orderBy: { createdAt: "desc" as const },
    take: 30,
  },
  presences: true,
};

/** 含記帳但不含結算（相容尚未建立 TripSettlement 表的資料庫） */
export const tripExpenseInclude = {
  ...tripCoreInclude,
  expenses: {
    include: { paidBy: true },
    orderBy: { createdAt: "desc" as const },
  },
};

/** 不含 activity/presence 表（相容舊 DB） */
export const tripDetailBaseInclude = {
  ...tripExpenseInclude,
  settlements: true,
};

/** 統一 Trip 查詢關聯，避免各 API 漏 include */
export const tripDetailInclude = {
  ...tripDetailBaseInclude,
  ...tripActivityInclude,
};

export const tripIncludeFallbacks = [
  tripDetailInclude,
  tripDetailBaseInclude,
  tripExpensePlainInclude,
  tripMinimalInclude,
] as const;

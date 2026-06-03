export const DEFAULT_TRIP_TASKS = [
  { title: "訂機票／大眾運輸", category: "booking", sortOrder: 0 },
  { title: "訂住宿", category: "booking", sortOrder: 1 },
  { title: "熱門餐廳／景點訂位", category: "booking", sortOrder: 2 },
  { title: "誰負責訂位（指定一人）", category: "booking", sortOrder: 3 },
  { title: "分帳方式（先墊、結算日）", category: "expense", sortOrder: 4 },
  { title: "共同帳本／收據拍照", category: "expense", sortOrder: 5 },
] as const;

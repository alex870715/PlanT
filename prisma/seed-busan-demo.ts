import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_CODE = "000000";

// 10 位團員
const MEMBERS = [
  "阿哲",
  "小柚",
  "Sam",
  "怡君",
  "Kevin",
  "美玲",
  "大雄",
  "Joanne",
  "宥廷",
  "Nina",
];

type TrunkSpot = {
  name: string;
  latitude: number;
  longitude: number;
  openHours?: string;
  notes?: string;
  day: number; // 0-based 第幾天
  hour: number;
  travelMode?: "walk" | "transit" | "drive" | "taxi" | "bike";
  travelMinutes?: number;
};

const TRUNK_SPOTS: TrunkSpot[] = [
  {
    name: "金海國際機場 (PUS)",
    latitude: 35.1795,
    longitude: 128.9382,
    openHours: "24hr",
    notes: "Day 1 · 抵達釜山，領行李、換韓元、儲值 T-money",
    day: 0,
    hour: 11,
  },
  {
    name: "西面 飯店 Check-in",
    latitude: 35.1577,
    longitude: 129.0594,
    openHours: "15:00 入住",
    notes: "Day 1 · 機場巴士到西面，放行李",
    day: 0,
    hour: 14,
    travelMode: "transit",
    travelMinutes: 50,
  },
  {
    name: "西面 豬肉湯飯一條街",
    latitude: 35.1559,
    longitude: 129.0608,
    openHours: "24hr",
    notes: "Day 1 · 第一餐：釜山名物豬肉湯飯",
    day: 0,
    hour: 19,
    travelMode: "walk",
    travelMinutes: 6,
  },
  {
    name: "甘川洞文化村",
    latitude: 35.0975,
    longitude: 129.0107,
    openHours: "09:00–18:00",
    notes: "Day 2 · 彩色山城、小王子拍照",
    day: 1,
    hour: 10,
    travelMode: "transit",
    travelMinutes: 40,
  },
  {
    name: "札嘎其市場",
    latitude: 35.0966,
    longitude: 129.0306,
    openHours: "05:00–22:00",
    notes: "Day 2 · 海鮮午餐，活章魚、烤魚",
    day: 1,
    hour: 13,
    travelMode: "transit",
    travelMinutes: 25,
  },
  {
    name: "BIFF 廣場",
    latitude: 35.0979,
    longitude: 129.0285,
    openHours: "10:00–22:00",
    notes: "Day 2 · 街頭小吃：堅果糖餅 (씨앗호떡)",
    day: 1,
    hour: 15,
    travelMode: "walk",
    travelMinutes: 5,
  },
  {
    name: "釜山塔 & 龍頭山公園",
    latitude: 35.1009,
    longitude: 129.0324,
    openHours: "10:00–22:00",
    notes: "Day 2 · 市區夜景",
    day: 1,
    hour: 18,
    travelMode: "walk",
    travelMinutes: 12,
  },
  {
    name: "海東龍宮寺",
    latitude: 35.1884,
    longitude: 129.2233,
    openHours: "05:00–19:20",
    notes: "Day 3 · 海邊寺廟，包車一日遊",
    day: 2,
    hour: 10,
    travelMode: "drive",
    travelMinutes: 60,
  },
  {
    name: "海雲台海水浴場",
    latitude: 35.1587,
    longitude: 129.1604,
    openHours: "24hr",
    notes: "Day 3 · 海灘散步、咖啡",
    day: 2,
    hour: 14,
    travelMode: "drive",
    travelMinutes: 45,
  },
  {
    name: "廣安里海水浴場 & 廣安大橋",
    latitude: 35.1532,
    longitude: 129.1186,
    openHours: "24hr",
    notes: "Day 3 · 大橋夜景、炸雞啤酒宵夜",
    day: 2,
    hour: 19,
    travelMode: "taxi",
    travelMinutes: 20,
  },
  {
    name: "太宗台",
    latitude: 35.0531,
    longitude: 129.0857,
    openHours: "09:00–18:00",
    notes: "Day 4 · Danubi 列車、海岸絕景",
    day: 3,
    hour: 10,
    travelMode: "transit",
    travelMinutes: 60,
  },
  {
    name: "樂天百貨 & 免稅店 (光復店)",
    latitude: 35.1009,
    longitude: 129.0366,
    openHours: "10:30–20:00",
    notes: "Day 4 · 伴手禮、免稅採買",
    day: 3,
    hour: 15,
    travelMode: "transit",
    travelMinutes: 40,
  },
  {
    name: "金海國際機場 (PUS) 返程",
    latitude: 35.1795,
    longitude: 128.9382,
    openHours: "24hr",
    notes: "Day 5 · 機場巴士返程，賦歸",
    day: 4,
    hour: 13,
    travelMode: "transit",
    travelMinutes: 50,
  },
];

type SproutSpot = {
  memberName: string; // 支線所屬團員
  name: string;
  latitude: number;
  longitude: number;
  openHours?: string;
  notes?: string;
  day: number; // 排進第幾天（0-based）
  hour: number;
  travelMode?: "walk" | "transit" | "drive" | "taxi" | "bike";
  travelMinutes?: number;
};

// 個人支線：只屬於各自團員，已排進該天行程。
// 切到某人的支線分頁時，地圖會把「主幹＋此人支線」依時間串成 1→S1→2→3。
const SPROUT_SPOTS: SproutSpot[] = [
  // 怡君（Day3 有兩個支線，示範主幹與支線交錯）
  {
    memberName: "怡君",
    name: "機張市場 帝王蟹",
    latitude: 35.2447,
    longitude: 129.2222,
    openHours: "08:00–22:00",
    notes: "怡君的支線：龍宮寺後想加碼吃帝王蟹",
    day: 2,
    hour: 12,
    travelMode: "drive",
    travelMinutes: 25,
  },
  {
    memberName: "怡君",
    name: "釜山 X the SKY 觀景台",
    latitude: 35.1591,
    longitude: 129.1739,
    openHours: "10:00–21:00",
    notes: "怡君的支線：海雲台 LCT 高空景觀，下午自己上去拍照",
    day: 2,
    hour: 16,
    travelMode: "taxi",
    travelMinutes: 15,
  },
  // Kevin（Day2 逛街）
  {
    memberName: "Kevin",
    name: "國際市場 & 富平罐頭夜市",
    latitude: 35.1011,
    longitude: 129.0264,
    openHours: "09:00–22:00",
    notes: "Kevin 的支線：緊鄰 BIFF 廣場，想逛街掃貨",
    day: 1,
    hour: 16,
    travelMode: "walk",
    travelMinutes: 5,
  },
  // Nina（Day4 咖啡）
  {
    memberName: "Nina",
    name: "田浦咖啡街",
    latitude: 35.1535,
    longitude: 129.0648,
    openHours: "11:00–23:00",
    notes: "Nina 的支線：晚上咖啡廳巡禮",
    day: 3,
    hour: 19,
    travelMode: "transit",
    travelMinutes: 25,
  },
  // 宥廷（Day4 影島）
  {
    memberName: "宥廷",
    name: "影島 흰여울文化村",
    latitude: 35.0782,
    longitude: 129.0445,
    openHours: "全日",
    notes: "宥廷的支線：太宗台之前順遊海邊壁畫村",
    day: 3,
    hour: 9,
    travelMode: "taxi",
    travelMinutes: 20,
  },
];

type ExpenseSeed = {
  title: string;
  amount: number; // 以 currency 計價
  paidBy: string;
  split: "all" | string[];
  notes?: string;
  /** 實際支付幣別，預設為旅程基準幣別 KRW */
  currency?: string;
  /** 換算成 KRW 的匯率 */
  exchangeRate?: number;
};

// 1 TWD ≈ 43.5 KRW（示範用）
const TWD_TO_KRW = 43.5;

const EXPENSES: ExpenseSeed[] = [
  {
    title: "台北⇄釜山 來回機票 ×10",
    amount: 80_500, // NT$80,500（在台灣刷卡）
    currency: "TWD",
    exchangeRate: TWD_TO_KRW,
    paidBy: "阿哲",
    split: "all",
    notes: "出發前在台灣刷卡，台幣計價",
  },
  {
    title: "西面飯店 4 晚（5 間雙人房）",
    amount: 55_000, // NT$55,000（Agoda 台幣付）
    currency: "TWD",
    exchangeRate: TWD_TO_KRW,
    paidBy: "小柚",
    split: "all",
    notes: "Agoda 訂房，台幣付款",
  },
  {
    title: "金海機場巴士 ×10（來回）",
    amount: 70_000,
    paidBy: "Kevin",
    split: "all",
  },
  {
    title: "T-money 交通卡儲值 ×10",
    amount: 150_000,
    paidBy: "Joanne",
    split: "all",
    notes: "地鐵、公車共用",
  },
  {
    title: "札嘎其市場 海鮮大餐",
    amount: 520_000,
    paidBy: "美玲",
    split: "all",
  },
  {
    title: "甘川洞文化村 導覽 + 接駁巴士",
    amount: 90_000,
    paidBy: "怡君",
    split: "all",
  },
  {
    title: "海東龍宮寺 包車一日遊",
    amount: 180_000,
    paidBy: "Sam",
    split: "all",
    notes: "9 人座包車含司機",
  },
  {
    title: "廣安里 炸雞啤酒宵夜",
    amount: 160_000,
    paidBy: "大雄",
    split: ["阿哲", "小柚", "大雄", "Kevin", "美玲", "Joanne", "宥廷", "Nina"],
    notes: "Sam、怡君當晚先回飯店休息",
  },
  {
    title: "太宗台 Danubi 列車 + 門票",
    amount: 60_000,
    paidBy: "宥廷",
    split: "all",
  },
  {
    title: "西面 豬肉湯飯晚餐",
    amount: 130_000,
    paidBy: "Nina",
    split: "all",
  },
  {
    title: "樂天免稅 伴手禮（公基金）",
    amount: 300_000,
    paidBy: "阿哲",
    split: "all",
    notes: "公用零食、伴手禮",
  },
  {
    title: "釜山塔 觀景門票",
    amount: 84_000,
    paidBy: "怡君",
    split: ["阿哲", "怡君", "Kevin", "美玲", "大雄", "宥廷", "Nina"],
    notes: "想上塔的人才分攤",
  },
];

type TaskSeed = {
  title: string;
  category: "booking" | "expense" | "other";
  assignee?: string;
  amount?: number;
  notes?: string;
  done?: boolean;
};

const TASKS: TaskSeed[] = [
  {
    title: "訂台北⇄釜山來回機票 ×10",
    category: "booking",
    assignee: "阿哲",
    amount: 3_500_000,
    done: true,
  },
  {
    title: "訂西面飯店 4 晚",
    category: "booking",
    assignee: "小柚",
    amount: 2_400_000,
    done: true,
  },
  {
    title: "海東龍宮寺 包車預約",
    category: "booking",
    assignee: "Sam",
    amount: 180_000,
    notes: "確認 9 人座與保險",
  },
  {
    title: "札嘎其市場 海鮮餐廳訂位",
    category: "booking",
    assignee: "美玲",
    notes: "10 人，晚上 7 點",
  },
  {
    title: "廣安大橋 遊船訂票",
    category: "booking",
    assignee: "大雄",
  },
  {
    title: "太宗台門票線上購買",
    category: "booking",
    assignee: "宥廷",
    amount: 60_000,
    done: true,
  },
  {
    title: "辦 eSIM / 租 Wi-Fi 機",
    category: "other",
    assignee: "Kevin",
    notes: "每人一張 eSIM",
  },
  {
    title: "換韓元現金 + 領 T-money",
    category: "other",
    assignee: "Joanne",
  },
];

async function main() {
  // 可重複執行：先清掉舊的 000000
  const existing = await prisma.trip.findUnique({
    where: { seedCode: SEED_CODE },
    select: { id: true },
  });
  if (existing) {
    await prisma.trip.delete({ where: { id: existing.id } });
    console.log(`已移除舊的範例行程（${SEED_CODE}）`);
  }

  const startDate = new Date("2026-08-14T09:00:00+09:00");
  const endDate = new Date("2026-08-18T18:00:00+09:00");

  const trip = await prisma.trip.create({
    data: {
      seedCode: SEED_CODE,
      title: "5天4夜 釜山揪團之旅 🇰🇷",
      startDate,
      endDate,
      currency: "KRW",
      members: { create: MEMBERS.map((name) => ({ name })) },
    },
    include: { members: true },
  });

  const memberByName = new Map(trip.members.map((m) => [m.name, m]));
  const allMemberIds = trip.members.map((m) => m.id);

  // 主幹景點
  for (let i = 0; i < TRUNK_SPOTS.length; i++) {
    const spot = TRUNK_SPOTS[i];
    const scheduledAt = new Date(startDate);
    scheduledAt.setDate(scheduledAt.getDate() + spot.day);
    scheduledAt.setHours(spot.hour, 0, 0, 0);

    await prisma.spot.create({
      data: {
        tripId: trip.id,
        name: spot.name,
        latitude: spot.latitude,
        longitude: spot.longitude,
        openHours: spot.openHours,
        notes: spot.notes,
        scheduledAt,
        travelMode: spot.travelMode,
        travelMinutes: spot.travelMinutes,
        isTrunk: true,
        sortOrder: i,
      },
    });
  }

  // 個人支線（已排進行程；部分依行程併回主線）
  for (let i = 0; i < SPROUT_SPOTS.length; i++) {
    const spot = SPROUT_SPOTS[i];
    const member = memberByName.get(spot.memberName);

    const scheduledAt = new Date(startDate);
    scheduledAt.setDate(scheduledAt.getDate() + spot.day);
    scheduledAt.setHours(spot.hour, 0, 0, 0);

    await prisma.spot.create({
      data: {
        tripId: trip.id,
        memberId: member?.id,
        name: spot.name,
        latitude: spot.latitude,
        longitude: spot.longitude,
        openHours: spot.openHours,
        notes: spot.notes,
        scheduledAt,
        travelMode: spot.travelMode,
        travelMinutes: spot.travelMinutes,
        isTrunk: false,
        sortOrder: i,
      },
    });
  }

  // 記帳
  for (const e of EXPENSES) {
    const payer = memberByName.get(e.paidBy);
    if (!payer) continue;
    const splitIds =
      e.split === "all"
        ? allMemberIds
        : e.split
            .map((n) => memberByName.get(n)?.id)
            .filter((id): id is string => Boolean(id));

    await prisma.tripExpense.create({
      data: {
        tripId: trip.id,
        title: e.title,
        amount: e.amount,
        currency: e.currency ?? "KRW",
        exchangeRate: e.exchangeRate ?? 1,
        paidByMemberId: payer.id,
        splitMemberIds: splitIds,
        notes: e.notes ?? null,
      },
    });
  }

  // 訂位 / 待辦
  for (let i = 0; i < TASKS.length; i++) {
    const t = TASKS[i];
    await prisma.tripTask.create({
      data: {
        tripId: trip.id,
        title: t.title,
        category: t.category,
        assignee: t.assignee ?? null,
        amount: t.amount ?? null,
        notes: t.notes ?? null,
        done: t.done ?? false,
        sortOrder: i,
      },
    });
  }

  const totalSpent = EXPENSES.reduce(
    (s, e) => s + e.amount * (e.exchangeRate ?? 1),
    0
  );
  const sproutMembers = [...new Set(SPROUT_SPOTS.map((s) => s.memberName))];

  console.log("\n🌱 釜山範例行程已建立！");
  console.log("─────────────────────────────");
  console.log(`標題：${trip.title}`);
  console.log(`Seed Code：${trip.seedCode}`);
  console.log(`幣別：KRW`);
  console.log(`團員：${MEMBERS.length} 人`);
  console.log(
    `主幹景點：${TRUNK_SPOTS.length}｜個人支線：${SPROUT_SPOTS.length}（${sproutMembers.join("、")}）`
  );
  console.log(`記帳：${EXPENSES.length} 筆，合計 ₩${totalSpent.toLocaleString()}`);
  console.log(`訂位/待辦：${TASKS.length} 筆`);
  console.log(`\n👉 開啟：http://localhost:3001/trip/${trip.seedCode}`);
  console.log("─────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

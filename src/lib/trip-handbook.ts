import type {
  HandbookRouteStep,
  HandbookSlide,
  HandbookSpotCard,
  HandbookSpotCategory,
  TripHandbook,
} from "@/types/trip-handbook";
import { tripDayCount } from "@/lib/trip-dates";
import { fetchPlacePhotos } from "@/lib/place-photos";
import {
  estimateTravelMinutes,
  formatTravelLeg,
  travelModeLabel,
  TRAVEL_MODES,
  type TravelModeId,
} from "@/lib/travel";
import {
  guideClosing,
  guideFoodNote,
  guideFoodIntro,
  guideMustTry,
  guidePurpose,
  guideLodgingNote,
  guideRouteSummary,
  guideSpotNote,
  guideSpotIntro,
  guideStayTip,
  guideTransportSummary,
} from "@/lib/handbook-narrative";

export type { HandbookSpotCategory } from "@/types/trip-handbook";

export type HandbookSpotInput = {
  name: string;
  category: HandbookSpotCategory;
  description: string | null;
  area: string | null;
  scheduledAt: Date | null;
  openHours: string | null;
  travelMode: string | null;
  travelMinutes: number | null;
  isTrunk: boolean;
  memberName: string | null;
  sortOrder: number;
  latitude: number;
  longitude: number;
  tags?: string[];
};

export type TripHandbookInput = {
  seedCode: string;
  title: string;
  startDate: Date;
  endDate: Date;
  memberNames: string[];
  spots: HandbookSpotInput[];
  destinationLabel?: string;
};

const FOOD_EMOJI = "🍽️";
const SPOT_EMOJI = "📍";
const LODGING_EMOJI = "🏨";

const FOOD_KEYWORDS = [
  "美食", "餐廳", "食堂", "咖啡", "拉麵", "燒肉", "海鮮", "小吃",
  "市場", "壽司", "居酒屋", "甜點", "酒吧", "早餐", "宵夜",
];

const LODGING_KEYWORDS = [
  "飯店", "住宿", "旅店", "民宿", "旅館", "hotel", "hostel", "motel",
  "inn", "airbnb", "lodging", "check-in", "check in", "checkin",
];

export function classifySpotCategory(
  name: string,
  notes: string | null | undefined
): HandbookSpotCategory {
  const note = notes ?? "";
  if (note.startsWith(LODGING_EMOJI)) return "lodging";
  if (note.startsWith(FOOD_EMOJI)) return "food";
  if (note.startsWith(SPOT_EMOJI)) return "spot";
  const hay = `${name} ${note}`.toLowerCase();
  if (LODGING_KEYWORDS.some((k) => hay.includes(k.toLowerCase()))) return "lodging";
  if (FOOD_KEYWORDS.some((k) => hay.includes(k))) return "food";
  return "spot";
}

export function parseSpotDescription(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  let text = notes.trim();
  if (text.startsWith(LODGING_EMOJI)) text = text.slice(LODGING_EMOJI.length).trim();
  else if (text.startsWith(FOOD_EMOJI)) text = text.slice(FOOD_EMOJI.length).trim();
  else if (text.startsWith(SPOT_EMOJI)) text = text.slice(SPOT_EMOJI.length).trim();
  text = text.replace(/\s*·\s*聲量\s*\d+\s*$/, "").trim();
  return text.replace(/（[^）]+）/g, "").trim() || null;
}

export function parseSpotArea(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  let text = notes.trim();
  if (text.startsWith(LODGING_EMOJI)) text = text.slice(LODGING_EMOJI.length).trim();
  else if (text.startsWith(FOOD_EMOJI)) text = text.slice(FOOD_EMOJI.length).trim();
  else if (text.startsWith(SPOT_EMOJI)) text = text.slice(SPOT_EMOJI.length).trim();
  text = text.replace(/\s*·\s*聲量\s*\d+\s*$/, "").trim();
  const areaMatch = text.match(/（([^）]+)）/);
  return areaMatch?.[1] ?? null;
}

function formatDateZh(date: Date): string {
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTimeZh(date: Date): string {
  return date.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dayKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function extractDestination(
  title: string,
  destinationLabel?: string
): string {
  if (destinationLabel?.trim()) return destinationLabel.trim();
  const cleaned = title
    .replace(/\s*探索之旅\s*🌿?/u, "")
    .replace(/\s*之旅\s*🌿?/u, "")
    .trim();
  return cleaned || title;
}

function topNames(
  spots: HandbookSpotInput[],
  category: HandbookSpotCategory,
  limit = 3
): string[] {
  return spots
    .filter((s) => s.category === category)
    .slice(0, limit)
    .map((s) => s.name);
}

export function inferTripPurpose(input: TripHandbookInput): string {
  const dest = extractDestination(input.title, input.destinationLabel);
  const trunk = input.spots.filter((s) => s.isTrunk);
  const days = tripDayCount(input.startDate, input.endDate);
  return guidePurpose(
    dest,
    days,
    topNames(trunk, "food", 2),
    topNames(trunk, "spot", 2),
    input.memberNames.length > 0 ? input.memberNames : ["探索隊長"]
  );
}

function spotToGuideCard(spot: HandbookSpotInput): HandbookSpotCard {
  const guideNote =
    spot.category === "lodging"
      ? guideLodgingNote(spot.name, spot.description, spot.area)
      : spot.category === "food"
        ? guideFoodNote(spot.name, spot.description, spot.area)
        : guideSpotNote(spot.name, spot.description, spot.area);

  return {
    name: spot.name,
    category: spot.category,
    description: spot.description,
    area: spot.area,
    time: spot.scheduledAt ? formatTimeZh(spot.scheduledAt) : null,
    openHours: spot.openHours,
    imageUrl: null,
    imageCredit: null,
    guideNote,
    mustTry:
      spot.category === "food" ? guideMustTry(spot.name, spot.category) : null,
    stayTip:
      spot.category === "spot" ? guideStayTip(spot.description) : null,
    tags: spot.tags,
  };
}

function resolveTravelLeg(
  spot: HandbookSpotInput,
  prev: HandbookSpotInput | null
): { label: string; minutes: number; mode: string } | null {
  const formatted = formatTravelLeg(spot.travelMode, spot.travelMinutes);
  if (formatted && spot.travelMinutes != null) {
    return {
      label: formatted,
      minutes: spot.travelMinutes,
      mode: spot.travelMode ?? "walk",
    };
  }
  if (!prev) return null;
  const mode = (spot.travelMode ?? "walk") as TravelModeId;
  const minutes = estimateTravelMinutes(
    prev.latitude,
    prev.longitude,
    spot.latitude,
    spot.longitude,
    mode
  );
  return {
    label: formatTravelLeg(mode, minutes) ?? `${travelModeLabel(mode)} · 約 ${minutes} 分`,
    minutes,
    mode,
  };
}

type DayGroup = {
  key: string;
  dateLabel: string;
  dayIndex: number;
  spots: HandbookSpotInput[];
};

function groupSpotsByDay(
  spots: HandbookSpotInput[],
  startDate: Date,
  endDate: Date
): DayGroup[] {
  const scheduled = spots.filter((s) => s.scheduledAt);
  const unscheduled = spots.filter((s) => !s.scheduledAt);
  const map = new Map<string, HandbookSpotInput[]>();

  for (const spot of scheduled) {
    const key = dayKey(spot.scheduledAt!);
    const list = map.get(key) ?? [];
    list.push(spot);
    map.set(key, list);
  }

  const groups: DayGroup[] = [];
  let dayIndex = 1;

  for (const key of [...map.keys()].sort()) {
    const daySpots = (map.get(key) ?? []).sort((a, b) => {
      const ta = a.scheduledAt?.getTime() ?? 0;
      const tb = b.scheduledAt?.getTime() ?? 0;
      return ta - tb || a.sortOrder - b.sortOrder;
    });
    groups.push({
      key,
      dateLabel: formatDateZh(new Date(key)),
      dayIndex,
      spots: daySpots,
    });
    dayIndex++;
  }

  if (unscheduled.length > 0) {
    groups.push({
      key: "unscheduled",
      dateLabel:
        groups.length > 0
          ? "待排時間"
          : `${formatDateZh(startDate)} – ${formatDateZh(endDate)}`,
      dayIndex: groups.length > 0 ? dayIndex : 1,
      spots: unscheduled.sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  return groups;
}

function resolveLodgingForDay(
  group: DayGroup,
  allLodgings: HandbookSpotInput[]
): HandbookSpotInput | null {
  const dayLodgings = group.spots.filter((s) => s.category === "lodging");
  if (dayLodgings.length > 0) return dayLodgings[0];

  if (group.key !== "unscheduled") {
    const scheduledOnDay = allLodgings.filter(
      (s) => s.scheduledAt && dayKey(s.scheduledAt) === group.key
    );
    if (scheduledOnDay.length > 0) return scheduledOnDay[0];
  }

  if (allLodgings.length === 1) return allLodgings[0];

  const unscheduledLodging = allLodgings.find((s) => !s.scheduledAt);
  if (unscheduledLodging) return unscheduledLodging;

  return allLodgings[0] ?? null;
}

function spotRouteStep(
  spot: HandbookSpotInput,
  lodgingRole?: "start" | "end"
): HandbookRouteStep {
  const card = spotToGuideCard(spot);
  return {
    kind: "spot",
    name: spot.name,
    category: spot.category,
    time: card.time,
    guideNote: card.guideNote,
    imageUrl: null,
    lodgingRole,
  };
}

function appendTravelStep(
  from: HandbookSpotInput,
  to: HandbookSpotInput,
  steps: HandbookRouteStep[],
  totalTravel: { minutes: number }
) {
  const leg = resolveTravelLeg(to, from);
  if (!leg) return;
  totalTravel.minutes += leg.minutes;
  steps.push({
    kind: "travel",
    travelLabel: leg.label,
    minutes: leg.minutes,
  });
}

function buildDayRoute(
  activitySpots: HandbookSpotInput[],
  lodging: HandbookSpotInput | null,
  anchorLodging: boolean
): {
  steps: HandbookRouteStep[];
  totalTravelMinutes: number;
  narrativeNames: string[];
  lodgingName: string | null;
} {
  const steps: HandbookRouteStep[] = [];
  const totalTravel = { minutes: 0 };
  const narrativeNames = activitySpots.map((s) => s.name);

  if (anchorLodging && lodging) {
    steps.push(spotRouteStep(lodging, "start"));
  }

  for (let i = 0; i < activitySpots.length; i++) {
    const spot = activitySpots[i];
    const prev =
      i > 0
        ? activitySpots[i - 1]
        : anchorLodging && lodging
          ? lodging
          : null;

    if (prev) {
      appendTravelStep(prev, spot, steps, totalTravel);
    }

    steps.push(spotRouteStep(spot));
  }

  if (anchorLodging && lodging) {
    const lastActivity = activitySpots[activitySpots.length - 1];
    if (lastActivity) {
      appendTravelStep(lastActivity, lodging, steps, totalTravel);
    }
    steps.push(spotRouteStep(lodging, "end"));
  }

  return {
    steps,
    totalTravelMinutes: totalTravel.minutes,
    narrativeNames,
    lodgingName: anchorLodging && lodging ? lodging.name : null,
  };
}

function buildTransportSlide(
  trunk: HandbookSpotInput[],
  dest: string
): HandbookSlide | null {
  const legMap = new Map<string, { count: number; totalMinutes: number }>();

  for (let i = 0; i < trunk.length; i++) {
    const leg = resolveTravelLeg(trunk[i], trunk[i - 1] ?? null);
    if (!leg || i === 0) continue;
    const entry = legMap.get(leg.mode) ?? { count: 0, totalMinutes: 0 };
    entry.count++;
    entry.totalMinutes += leg.minutes;
    legMap.set(leg.mode, entry);
  }

  if (legMap.size === 0) return null;

  const legs = [...legMap.entries()].map(([mode, stats]) => {
    const found = TRAVEL_MODES.find((m) => m.id === mode);
    return {
      mode,
      label: found?.label ?? mode,
      emoji: found?.emoji ?? "🚌",
      count: stats.count,
      totalMinutes: stats.totalMinutes,
    };
  });

  const primary = legs.sort((a, b) => b.totalMinutes - a.totalMinutes)[0];
  const totalMinutes = legs.reduce((s, l) => s + l.totalMinutes, 0);

  return {
    type: "transport",
    chapterTitle: "交通方式",
    summary: guideTransportSummary(dest, primary.label, totalMinutes),
    legs,
  };
}

/** 同步建立旅遊手冊投影片（不含圖片） */
export function buildHandbookSlides(
  input: TripHandbookInput,
  purpose: string,
  options?: { anchorLodging?: boolean }
): HandbookSlide[] {
  const anchorLodging = options?.anchorLodging ?? true;
  const dest = extractDestination(input.title, input.destinationLabel);
  const days = tripDayCount(input.startDate, input.endDate);
  const trunk = input.spots.filter((s) => s.isTrunk);
  const lodgings = trunk.filter((s) => s.category === "lodging");
  const foods = trunk.filter((s) => s.category === "food");
  const sights = trunk.filter((s) => s.category === "spot");
  const dayGroups = groupSpotsByDay(trunk, input.startDate, input.endDate);
  const members =
    input.memberNames.length > 0 ? input.memberNames : ["探索隊長"];

  const slides: HandbookSlide[] = [
    {
      type: "cover",
      title: input.title,
      destination: dest,
      dateRange: `${formatDateZh(input.startDate)} – ${formatDateZh(input.endDate)}`,
      days,
      seedCode: input.seedCode,
      members,
      heroImageUrl: null,
      heroImageCredit: null,
      subtitle: `${dest} 旅遊手冊`,
    },
    {
      type: "purpose",
      chapterTitle: "行程概要",
      purpose,
      destination: dest,
      foodCount: foods.length,
      spotCount: sights.length,
      days,
      members: input.memberNames,
    },
  ];

  if (foods.length > 0) {
    slides.push({
      type: "food-chapter",
      chapterTitle: "美食導覽",
      subtitle: `${dest} 美食地圖`,
      intro: guideFoodIntro(dest, foods.length),
      items: foods.map(spotToGuideCard),
    });
  }

  if (sights.length > 0) {
    slides.push({
      type: "spot-chapter",
      chapterTitle: "景點導覽",
      subtitle: `${dest} 景點地圖`,
      intro: guideSpotIntro(dest, sights.length),
      items: sights.map(spotToGuideCard),
    });
  }

  if (dayGroups.length === 0) {
    slides.push({
      type: "overview",
      title: "路線待安排",
      message:
        "主線路線尚未安排。請回到 PlanT 工作區新增景點並排程。",
    });
  } else {
    for (const group of dayGroups) {
      const lodging = resolveLodgingForDay(group, lodgings);
      const activitySpots = group.spots.filter((s) => s.category !== "lodging");
      const route = buildDayRoute(activitySpots, lodging, anchorLodging);

      slides.push({
        type: "route",
        chapterTitle: `第 ${group.dayIndex} 日路線`,
        dayIndex: group.dayIndex,
        dateLabel: group.dateLabel,
        narrative: guideRouteSummary(
          group.dayIndex,
          route.narrativeNames,
          route.lodgingName
        ),
        steps: route.steps,
        totalTravelMinutes: route.totalTravelMinutes,
      });
    }
  }

  const transport = buildTransportSlide(trunk, dest);
  if (transport) slides.push(transport);

  slides.push({
    type: "closing",
    seedCode: input.seedCode,
    title: input.title,
    destination: dest,
    message: guideClosing(dest),
  });

  return slides;
}

const MAX_PHOTO_FETCHES = 16;

async function photoForSpot(spot: HandbookSpotInput) {
  const photos = await fetchPlacePhotos(
    spot.name,
    spot.latitude,
    spot.longitude,
    1
  );
  return photos[0] ?? null;
}

function enrichCard(
  card: HandbookSpotCard,
  photo: { url: string; credit: string } | null
): HandbookSpotCard {
  if (!photo) return card;
  return {
    ...card,
    imageUrl: photo.url,
    imageCredit: photo.credit,
  };
}

/** 為投影片附上參考圖 */
export async function enrichHandbookWithPhotos(
  slides: HandbookSlide[],
  input: TripHandbookInput
): Promise<HandbookSlide[]> {
  const trunk = input.spots.filter((s) => s.isTrunk);
  const dest = extractDestination(input.title, input.destinationLabel);

  let fetchBudget = MAX_PHOTO_FETCHES;
  const spotPhotoCache = new Map<string, { url: string; credit: string }>();

  async function getPhoto(spot: HandbookSpotInput) {
    const cached = spotPhotoCache.get(spot.name);
    if (cached) return cached;
    if (fetchBudget <= 0) return null;
    fetchBudget--;
    const photo = await photoForSpot(spot);
    if (!photo) return null;
    const entry = { url: photo.url, credit: photo.credit };
    spotPhotoCache.set(spot.name, entry);
    return entry;
  }

  const enriched: HandbookSlide[] = [];

  for (const slide of slides) {
    if (slide.type === "cover") {
      const heroSpot = trunk[0];
      let hero = heroSpot ? await getPhoto(heroSpot) : null;
      if (!hero && fetchBudget > 0) {
        fetchBudget--;
        const destPhotos = await fetchPlacePhotos(dest, 0, 0, 1);
        hero = destPhotos[0]
          ? { url: destPhotos[0].url, credit: destPhotos[0].credit }
          : null;
      }
      enriched.push({
        ...slide,
        heroImageUrl: hero?.url ?? null,
        heroImageCredit: hero?.credit ?? null,
      });
      continue;
    }

    if (slide.type === "food-chapter" || slide.type === "spot-chapter") {
      const items = await Promise.all(
        slide.items.map(async (item) => {
          const spot = input.spots.find((s) => s.name === item.name);
          if (!spot) return item;
          const photo = await getPhoto(spot);
          return enrichCard(item, photo);
        })
      );
      enriched.push({ ...slide, items });
      continue;
    }

    if (slide.type === "route") {
      const steps = await Promise.all(
        slide.steps.map(async (step) => {
          if (step.kind !== "spot") return step;
          const spot = input.spots.find((s) => s.name === step.name);
          if (!spot) return step;
          const photo = await getPhoto(spot);
          return {
            ...step,
            imageUrl: photo?.url ?? step.imageUrl,
          };
        })
      );
      enriched.push({ ...slide, steps });
      continue;
    }

    enriched.push(slide);
  }

  return enriched;
}

export async function generateTripHandbook(
  input: TripHandbookInput,
  options?: { anchorLodging?: boolean }
): Promise<TripHandbook> {
  const anchorLodging = options?.anchorLodging ?? true;
  const purpose = inferTripPurpose(input);
  const baseSlides = buildHandbookSlides(input, purpose, { anchorLodging });
  const slides = await enrichHandbookWithPhotos(baseSlides, input);
  return { theme: "fairy-tale", purpose, slides, anchorLodging };
}

export function buildTripHandbookInputFromTrip(
  trip: {
    seedCode: string;
    title: string;
    startDate: Date;
    endDate: Date;
    members: { name: string }[];
    spots: {
      name: string;
      notes: string | null;
      openHours: string | null;
      scheduledAt: Date | null;
      travelMode: string | null;
      travelMinutes: number | null;
      isTrunk: boolean;
      sortOrder: number;
      latitude: number;
      longitude: number;
      member?: { name: string } | null;
    }[];
  },
  options?: { destinationLabel?: string }
): TripHandbookInput {
  return {
    seedCode: trip.seedCode,
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    memberNames: trip.members.map((m) => m.name),
    destinationLabel: options?.destinationLabel,
    spots: trip.spots.map((s) => ({
      name: s.name,
      category: classifySpotCategory(s.name, s.notes),
      description: parseSpotDescription(s.notes),
      area: parseSpotArea(s.notes),
      scheduledAt: s.scheduledAt,
      openHours: s.openHours,
      travelMode: s.travelMode,
      travelMinutes: s.travelMinutes,
      isTrunk: s.isTrunk,
      memberName: s.member?.name ?? null,
      sortOrder: s.sortOrder,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
  };
}

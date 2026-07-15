export type HandbookThemeId = "fairy-tale";

export type HandbookSpotCategory = "food" | "spot" | "lodging";

export type HandbookSpotCard = {
  name: string;
  category: HandbookSpotCategory;
  description: string | null;
  area: string | null;
  time: string | null;
  openHours?: string | null;
  imageUrl: string | null;
  imageCredit: string | null;
  /** 童話導覽語（可編輯） */
  guideNote: string;
  /** 美食必點 */
  mustTry?: string | null;
  /** 景點停留建議 */
  stayTip?: string | null;
  tags?: string[];
};

export type HandbookCoverSlide = {
  type: "cover";
  title: string;
  destination: string;
  dateRange: string;
  days: number;
  seedCode: string;
  members: string[];
  heroImageUrl: string | null;
  heroImageCredit: string | null;
  /** 扉頁副標（可編輯） */
  subtitle: string;
};

export type HandbookPurposeSlide = {
  type: "purpose";
  chapterTitle: string;
  purpose: string;
  destination: string;
  foodCount: number;
  spotCount: number;
  days: number;
  members: string[];
};

export type HandbookGuideChapterSlide = {
  type: "food-chapter" | "spot-chapter";
  chapterTitle: string;
  subtitle: string;
  intro: string;
  items: HandbookSpotCard[];
};

export type HandbookRouteStep =
  | {
      kind: "spot";
      name: string;
      category: HandbookSpotCategory;
      time: string | null;
      guideNote: string;
      imageUrl: string | null;
      /** 住宿作為每日起訖點時標示 */
      lodgingRole?: "start" | "end";
    }
  | {
      kind: "travel";
      travelLabel: string;
      minutes: number;
    };

export type HandbookRouteSlide = {
  type: "route";
  chapterTitle: string;
  dayIndex: number;
  dateLabel: string;
  narrative: string;
  steps: HandbookRouteStep[];
  totalTravelMinutes: number;
};

export type HandbookTransportLeg = {
  mode: string;
  label: string;
  emoji: string;
  count: number;
  totalMinutes: number;
};

export type HandbookTransportSlide = {
  type: "transport";
  chapterTitle: string;
  summary: string;
  legs: HandbookTransportLeg[];
};

export type HandbookOverviewSlide = {
  type: "overview";
  title: string;
  message: string;
};

export type HandbookClosingSlide = {
  type: "closing";
  seedCode: string;
  title: string;
  destination: string;
  message: string;
};

export type HandbookSlide =
  | HandbookCoverSlide
  | HandbookPurposeSlide
  | HandbookGuideChapterSlide
  | HandbookRouteSlide
  | HandbookTransportSlide
  | HandbookOverviewSlide
  | HandbookClosingSlide;

export type TripHandbook = {
  theme: HandbookThemeId;
  purpose: string;
  slides: HandbookSlide[];
  /** 每日路線以住宿為起訖點 */
  anchorLodging: boolean;
};

export type TripHandbookDto = TripHandbook & {
  generatedAt: string;
  updatedAt: string;
};

export type SpotDto = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  openHours: string | null;
  phone: string | null;
  notes: string | null;
  scheduledAt: string | null;
  travelMode: string | null;
  travelMinutes: number | null;
  isTrunk: boolean;
  sortOrder: number;
  memberId: string | null;
  member?: { id: string; name: string } | null;
};

export type MemberDto = {
  id: string;
  name: string;
  email: string | null;
};

export type TripTaskAttachmentDto = {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
  uploadedBy: string | null;
  createdAt: string;
};

export type TripTaskConfirmationDto = {
  memberId: string;
  memberName: string;
  confirmedAt: string;
};

export type TripTaskDto = {
  id: string;
  title: string;
  category: string;
  assignee: string | null;
  amount: number | null;
  notes: string | null;
  done: boolean;
  sortOrder: number;
  attachments: TripTaskAttachmentDto[];
  confirmations: TripTaskConfirmationDto[];
};

export type TripExpenseDto = {
  id: string;
  title: string;
  /** 原始付款金額（以 currency 計價） */
  amount: number;
  /** 此筆花費實際支付的幣別 */
  currency: string;
  /** 換算成旅程基準幣別的匯率 */
  exchangeRate: number;
  /** 換算後的基準幣別金額 = amount * exchangeRate */
  baseAmount: number;
  paidByMemberId: string;
  paidByName: string | null;
  splitMemberIds: string[];
  notes: string | null;
  createdAt: string;
};

export type TripSettlementDto = {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  done: boolean;
};

export type TripDto = {
  id: string;
  seedCode: string;
  title: string;
  startDate: string;
  endDate: string;
  currency: string;
  spots: SpotDto[];
  members: MemberDto[];
  tasks: TripTaskDto[];
  expenses: TripExpenseDto[];
  settlements: TripSettlementDto[];
};

export type CreateTripBody = {
  title: string;
  startDate: string;
  endDate: string;
  memberName?: string;
};

export type CreateSpotBody = {
  name: string;
  latitude: number;
  longitude: number;
  openHours?: string;
  phone?: string;
  notes?: string;
  scheduledAt?: string;
  isTrunk?: boolean;
  memberId?: string;
  memberName?: string;
};

export type UpdateSpotBody = {
  name?: string;
  latitude?: number;
  longitude?: number;
  openHours?: string | null;
  phone?: string | null;
  notes?: string | null;
  scheduledAt?: string | null;
  travelMode?: string | null;
  travelMinutes?: number | null;
  sortOrder?: number;
};

export type CreateMemberBody = {
  name: string;
  email?: string;
};

export type UpdateMemberBody = {
  name?: string;
  email?: string | null;
};

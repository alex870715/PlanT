import { formatTravelLeg } from "@/lib/travel";

export function TravelLegBadge({
  travelMode,
  travelMinutes,
}: {
  travelMode: string | null;
  travelMinutes: number | null;
}) {
  const label = formatTravelLeg(travelMode, travelMinutes);
  if (!label) return null;

  return (
    <div className="flex items-center gap-1 py-1 pl-9 text-[11px] text-sky-800">
      <span className="text-sky-400">↓</span>
      <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium">
        {label}
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/datetime";
import {
  estimateTravelMinutes,
  TRAVEL_MODES,
  type TravelModeId,
} from "@/lib/travel";
import { seededFetch } from "@/lib/trip-client";
import type { SpotDto } from "@/types/trip";

type SpotEditDialogProps = {
  spot: SpotDto | null;
  previousSpot?: SpotDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  mapPickActive?: boolean;
  onStartMapPick?: () => void;
  mapPickResult?: { lat: number; lng: number } | null;
};

export function SpotEditDialog({
  spot,
  previousSpot,
  open,
  onOpenChange,
  onSaved,
  mapPickActive,
  onStartMapPick,
  mapPickResult,
}: SpotEditDialogProps) {
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [openHours, setOpenHours] = useState("");
  const [notes, setNotes] = useState("");
  const [travelMode, setTravelMode] = useState("");
  const [travelMinutes, setTravelMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateSource, setEstimateSource] = useState<
    "osrm" | "haversine" | null
  >(null);

  useEffect(() => {
    if (!spot) return;
    setName(spot.name);
    setLatitude(String(spot.latitude));
    setLongitude(String(spot.longitude));
    setScheduledAt(toDatetimeLocalValue(spot.scheduledAt));
    setOpenHours(spot.openHours ?? "");
    setNotes(spot.notes ?? "");
    setTravelMode(spot.travelMode ?? "walk");
    setTravelMinutes(
      spot.travelMinutes != null ? String(spot.travelMinutes) : ""
    );
    setError(null);
    setEstimateSource(null);
  }, [spot]);

  useEffect(() => {
    if (!mapPickResult) return;
    setLatitude(String(Number(mapPickResult.lat.toFixed(6))));
    setLongitude(String(Number(mapPickResult.lng.toFixed(6))));
  }, [mapPickResult]);

  async function estimateFromPrevious() {
    if (!spot || !previousSpot) return;
    const mode = (travelMode || "walk") as TravelModeId;
    const toLat = Number(latitude) || spot.latitude;
    const toLng = Number(longitude) || spot.longitude;

    setEstimating(true);
    setEstimateSource(null);
    try {
      const params = new URLSearchParams({
        fromLat: String(previousSpot.latitude),
        fromLng: String(previousSpot.longitude),
        toLat: String(toLat),
        toLng: String(toLng),
        mode,
      });
      const res = await fetch(`/api/route?${params.toString()}`);
      if (!res.ok) throw new Error("route failed");
      const data = (await res.json()) as {
        minutes: number;
        source: "osrm" | "haversine";
      };
      setTravelMinutes(String(data.minutes));
      setEstimateSource(data.source);
    } catch {
      // 後端不可用時，前端以直線估算退回
      const mins = estimateTravelMinutes(
        previousSpot.latitude,
        previousSpot.longitude,
        toLat,
        toLng,
        mode
      );
      setTravelMinutes(String(mins));
      setEstimateSource("haversine");
    } finally {
      setEstimating(false);
    }
  }

  async function handleSave() {
    if (!spot || !name.trim()) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("請輸入有效的經緯度");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await seededFetch(`/api/spot/${spot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          latitude: lat,
          longitude: lng,
          scheduledAt: fromDatetimeLocalValue(scheduledAt),
          openHours: openHours.trim() || null,
          notes: notes.trim() || null,
          travelMode: previousSpot ? travelMode || null : null,
          travelMinutes:
            previousSpot && travelMinutes !== ""
              ? Number(travelMinutes)
              : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "儲存失敗");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!spot) return;
    if (!confirm(`確定刪除「${spot.name}」？`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await seededFetch(`/api/spot/${spot.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "刪除失敗");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-emerald-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-emerald-950">編輯景點</DialogTitle>
          <DialogDescription>
            調整位置、時間，以及從上一站到此站的交通
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-800">
              名稱
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-800">
              地圖位置（經緯度）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="緯度"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="經度"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="text-sm"
              />
            </div>
            {onStartMapPick && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-8 w-full text-xs"
                onClick={onStartMapPick}
              >
                <MapPin className="h-3.5 w-3.5" />
                {mapPickActive ? "點擊右側地圖放置…" : "在地圖上點選位置"}
              </Button>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              編輯時也可直接拖曳地圖上的標記
            </p>
          </div>

          {previousSpot && (
            <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-3">
              <p className="mb-2 text-xs font-medium text-sky-900">
                從「{previousSpot.name}」到此站
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="h-9 rounded-md border border-sky-200 bg-white px-2 text-sm"
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                >
                  {TRAVEL_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  placeholder="分鐘"
                  value={travelMinutes}
                  onChange={(e) => setTravelMinutes(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-sky-800"
                  disabled={estimating}
                  onClick={() => void estimateFromPrevious()}
                >
                  {estimating ? "計算中…" : "依路線估算時間"}
                </Button>
                {estimateSource && (
                  <span className="text-[10px] text-sky-700">
                    {estimateSource === "osrm" ? "沿道路 OSRM" : "直線估算"}
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-800">
              行程時間
            </label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-800">
              營業／開放時間（選填）
            </label>
            <Input
              placeholder="例：10:00–21:00"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-800">
              備註
            </label>
            <Input
              placeholder="例：午餐、預約編號"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            <Trash2 className="h-4 w-4" />
            刪除
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "儲存中…" : "儲存"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

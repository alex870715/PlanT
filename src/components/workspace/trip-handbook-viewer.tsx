"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Save,
} from "lucide-react";
import { HandbookSlideView } from "@/components/workspace/handbook-slides";
import { exportAllSlidesToPng, exportSlideToPng } from "@/lib/handbook-export";
import { seededFetch } from "@/lib/trip-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { HandbookSlide, TripHandbookDto } from "@/types/trip-handbook";

type TripHandbookViewerProps = {
  seedCode: string;
  canEdit?: boolean;
  autoOpen?: boolean;
};

function setByPath(
  slides: HandbookSlide[],
  fullPath: string,
  value: string
): HandbookSlide[] {
  const parts = fullPath.split(".");
  const slideIdx = Number(parts[0]);
  if (Number.isNaN(slideIdx) || !slides[slideIdx]) return slides;

  const next = [...slides];
  const slide = JSON.parse(JSON.stringify(slides[slideIdx])) as HandbookSlide;
  let cursor: Record<string, unknown> | unknown[] = slide as Record<string, unknown>;

  for (let i = 1; i < parts.length - 1; i++) {
    const key = parts[i];
    const idx = Number(key);
    const next = Number.isNaN(idx)
      ? (cursor as Record<string, unknown>)[key]
      : (cursor as unknown[])[idx];
    if (next === undefined || next === null) return slides;
    cursor = next as Record<string, unknown> | unknown[];
  }

  const last = parts[parts.length - 1];
  const lastIdx = Number(last);
  if (Number.isNaN(lastIdx)) {
    (cursor as Record<string, unknown>)[last] = value;
  } else {
    (cursor as unknown[])[lastIdx] = value;
  }

  next[slideIdx] = slide;
  return next;
}

export function TripHandbookViewer({
  seedCode,
  canEdit = false,
  autoOpen = false,
}: TripHandbookViewerProps) {
  const [open, setOpen] = useState(false);
  const [handbook, setHandbook] = useState<TripHandbookDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchHandbook = useCallback(async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await seededFetch(
        `/api/trip/${seedCode}/handbook`,
        regenerate ? { method: "POST" } : undefined
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "無法載入旅遊手冊");
      setHandbook(data as TripHandbookDto);
      setSlideIndex(0);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "無法載入旅遊手冊");
    } finally {
      setLoading(false);
    }
  }, [seedCode]);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      void fetchHandbook();
    }
  }, [autoOpen, fetchHandbook]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !handbook && !loading) {
      void fetchHandbook();
    }
    if (!next) setEditing(false);
  }

  const slides = handbook?.slides ?? [];
  const current = slides[slideIndex];

  function handleEdit(path: string, value: string) {
    if (!handbook) return;
    const slidePath = `${slideIndex}.${path}`;
    setHandbook({
      ...handbook,
      slides: setByPath(handbook.slides, slidePath, value),
    });
    setDirty(true);
  }

  async function saveEdits() {
    if (!handbook || !dirty) return;
    setSaving(true);
    try {
      const res = await seededFetch(`/api/trip/${seedCode}/handbook`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: handbook.purpose,
          slides: handbook.slides,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "儲存失敗");
      setHandbook(data as TripHandbookDto);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function exportCurrentPng() {
    if (!slideRef.current) return;
    setExporting(true);
    try {
      await exportSlideToPng(
        slideRef.current,
        `PlanT-旅遊手冊-${seedCode}-第${slideIndex + 1}頁.png`
      );
    } finally {
      setExporting(false);
    }
  }

  async function exportAllPng() {
    const nodes = printRef.current?.querySelectorAll(".handbook-slide-export");
    if (!nodes?.length) return;
    setExporting(true);
    try {
      await exportAllSlidesToPng(
        [...nodes] as HTMLElement[],
        `PlanT-旅遊手冊-${seedCode}`
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookOpen className="h-4 w-4" />
          旅遊手冊
        </Button>
      </DialogTrigger>
      <DialogContent className="handbook-dialog max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="border-b border-amber-100 bg-[#faf6ee] px-4 py-3 sm:px-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-serif text-[#3d2f24]">
              📖 旅遊手冊
            </DialogTitle>
            <DialogDescription className="text-[#6b5a48]">
              繪本風格版面 · 美食／景點／路線／交通 · 可編輯、可匯出 PNG
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant={editing ? "default" : "ghost"}
                  size="sm"
                  className="gap-1"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editing ? "編輯中" : "編輯文字"}
                </Button>
                {dirty && (
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={saving}
                    onClick={() => void saveEdits()}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "儲存中…" : "儲存"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  disabled={loading}
                  onClick={() => void fetchHandbook(true)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新生成
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={!handbook || loading || exporting}
              onClick={() => void exportCurrentPng()}
            >
              <Download className="h-3.5 w-3.5" />
              匯出此頁 PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={!handbook || loading || exporting}
              onClick={() => void exportAllPng()}
            >
              <Download className="h-3.5 w-3.5" />
              匯出全部（Canva）
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              disabled={!handbook || loading}
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" />
              列印
            </Button>
          </div>
        </div>

        <div
          ref={printRef}
          className="handbook-fairy-tale handbook-print-area bg-[#ebe3d3] p-3 sm:p-4"
        >
          {loading && (
            <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-2xl bg-[#faf6ee] text-[#6b5a48]">
              <Loader2 className="h-8 w-8 animate-spin text-[#2d6a4f]" />
              <p className="text-sm font-serif">正在排版旅遊手冊…</p>
            </div>
          )}

          {error && (
            <p className="py-16 text-center text-sm text-red-700">{error}</p>
          )}

          {!loading && !error && current && (
            <>
              <div ref={slideRef} className="handbook-slide-shell print:hidden">
                <HandbookSlideView
                  slide={current}
                  editing={editing && canEdit}
                  onEdit={handleEdit}
                />
              </div>
              <div className="hidden print:block">
                {slides.map((slide, i) => (
                  <div key={i} className="handbook-slide-shell mb-4">
                    <HandbookSlideView slide={slide} />
                  </div>
                ))}
              </div>
              <div className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
                {slides.map((slide, i) => (
                  <div
                    key={`export-${i}`}
                    className="handbook-slide-export mb-4 w-[896px]"
                  >
                    <HandbookSlideView slide={slide} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!loading && slides.length > 1 && (
          <div className="flex items-center justify-between border-t border-amber-100 bg-[#faf6ee] px-4 py-3 sm:px-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
              disabled={slideIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              上一頁
            </Button>
            <div className="flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`第 ${i + 1} 頁`}
                  title={
                    s.type === "cover"
                      ? "扉頁"
                      : "chapterTitle" in s
                        ? s.chapterTitle
                        : "title" in s
                          ? String(s.title)
                          : `第 ${i + 1} 頁`
                  }
                  className={`h-2 rounded-full transition-all ${
                    i === slideIndex
                      ? "w-6 bg-[#2d6a4f]"
                      : "w-2 bg-[#d4c4a8] hover:bg-[#bc6c25]"
                  }`}
                  onClick={() => setSlideIndex(i)}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSlideIndex((i) => Math.min(slides.length - 1, i + 1))
              }
              disabled={slideIndex >= slides.length - 1}
            >
              下一頁
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

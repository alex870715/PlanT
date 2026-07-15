"use client";

import Image from "next/image";
import type { HandbookSlide } from "@/types/trip-handbook";

type HandbookSlidesProps = {
  slide: HandbookSlide;
  editing?: boolean;
  onEdit?: (path: string, value: string) => void;
};

function BookPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="handbook-slide aspect-[16/10]">
      <div className="hb-frame" aria-hidden />
      <div className="hb-content flex h-full flex-col">{children}</div>
    </div>
  );
}

export function HandbookSlideView({
  slide,
  editing = false,
  onEdit,
}: HandbookSlidesProps) {
  const editProps = (path: string, value: string) => ({
    className: "hb-editable",
    contentEditable: editing,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const next = e.currentTarget.textContent?.trim() ?? "";
      if (next !== value) onEdit?.(path, next);
    },
  });

  switch (slide.type) {
    case "cover":
      return (
        <BookPage>
          <div className="relative h-full overflow-hidden">
            {slide.heroImageUrl ? (
              <Image
                src={slide.heroImageUrl}
                alt={slide.destination}
                fill
                className="object-cover"
                unoptimized
                sizes="896px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#5a8f7b] via-[#7ab8a8] to-[#c9dfc8]" />
            )}
            <div className="hb-cover-vignette absolute inset-0" />
            <div className="hb-cover-band absolute inset-0" />
            <div className="relative flex h-full flex-col items-center justify-center px-10 text-center text-white sm:px-14">
              <p className="text-[0.65rem] tracking-[0.35em] text-amber-200/90">
                TRAVEL HANDBOOK
              </p>
              <h2
                {...editProps("title", slide.title)}
                className="mt-4 font-serif text-3xl font-bold leading-tight drop-shadow sm:text-5xl"
              >
                {slide.title}
              </h2>
              <div className="my-4 h-px w-24 bg-amber-300/60" />
              <p
                {...editProps("subtitle", slide.subtitle)}
                className="max-w-md text-base text-white/90 sm:text-lg"
              >
                {slide.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-white/80">
                <span>📅 {slide.dateRange}</span>
                <span>🗓 {slide.days} 天</span>
                <span>👥 {slide.members.join("、")}</span>
              </div>
            </div>
          </div>
        </BookPage>
      );

    case "purpose":
      return (
        <BookPage>
          <div className="grid h-full grid-cols-1 sm:grid-cols-12">
            <div className="flex flex-col justify-center border-b border-[var(--hb-border)] bg-[var(--hb-paper-warm)] p-6 sm:col-span-4 sm:border-b-0 sm:border-r">
              <p className="hb-chapter-num">{String(slide.days).padStart(2, "0")}</p>
              <p className="hb-chapter-label mt-2">OVERVIEW</p>
              <h3 className="hb-section-title mt-1">行程總覽</h3>
              <ul className="mt-5 space-y-2">
                <TocItem label="美食導覽" page={slide.foodCount > 0 ? "美食章" : "—"} />
                <TocItem label="景點導覽" page={slide.spotCount > 0 ? "景點章" : "—"} />
                <TocItem label="每日路線" page="路線章" />
                <TocItem label="交通方式" page="交通章" />
              </ul>
            </div>
            <div className="flex flex-col justify-center p-6 sm:col-span-8 sm:p-8">
              <p className="hb-chapter-label">{slide.chapterTitle}</p>
              <p
                {...editProps("purpose", slide.purpose)}
                className="hb-body mt-4 text-base sm:text-[1.05rem]"
              >
                {slide.purpose}
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <Stat icon="🗓" label="天數" value={`${slide.days}`} />
                <Stat icon="🍽" label="美食" value={`${slide.foodCount}`} />
                <Stat icon="📍" label="景點" value={`${slide.spotCount}`} />
              </div>
            </div>
          </div>
        </BookPage>
      );

    case "food-chapter":
      return (
        <BookPage>
          <ChapterHeader
            num="02"
            label="FOOD GUIDE"
            title={slide.subtitle}
            intro={slide.intro}
            accent="food"
            editing={editing}
            onEdit={onEdit}
          />
          <div className="flex-1 overflow-y-auto px-6 pb-5 pt-2 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {slide.items.map((item, i) => (
                <GuideCard
                  key={item.name}
                  item={item}
                  variant="food"
                  editing={editing}
                  basePath={`items.${i}`}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        </BookPage>
      );

    case "spot-chapter":
      return (
        <BookPage>
          <ChapterHeader
            num="03"
            label="SIGHTSEEING"
            title={slide.subtitle}
            intro={slide.intro}
            accent="spot"
            editing={editing}
            onEdit={onEdit}
          />
          <div className="flex-1 overflow-y-auto px-6 pb-5 pt-2 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {slide.items.map((item, i) => (
                <GuideCard
                  key={item.name}
                  item={item}
                  variant="spot"
                  editing={editing}
                  basePath={`items.${i}`}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        </BookPage>
      );

    case "route":
      return (
        <BookPage>
          <div className="flex h-full flex-col">
            <div className="border-b border-[var(--hb-border)] bg-[var(--hb-paper-warm)] px-6 py-4 sm:px-8">
              <div className="flex items-start gap-4">
                <p className="hb-chapter-num text-4xl">04</p>
                <div>
                  <p className="hb-chapter-label">DAILY ROUTE</p>
                  <h3 className="hb-section-title">
                    第 {slide.dayIndex} 日 · {slide.dateLabel}
                  </h3>
                  <p
                    {...editProps("narrative", slide.narrative)}
                    className="hb-body mt-2 text-sm"
                  >
                    {slide.narrative}
                  </p>
                  {slide.totalTravelMinutes > 0 && (
                    <p className="mt-2 text-xs font-medium text-[var(--hb-accent)]">
                      今日移動約 {slide.totalTravelMinutes} 分鐘
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="hb-route-path flex-1 overflow-y-auto px-8 py-4 sm:px-10">
              {slide.steps.map((step, i) =>
                step.kind === "travel" ? (
                  <div key={`t-${i}`} className="hb-travel-bridge">
                    <span className="hb-travel-bridge-line" />
                    <span className="hb-travel-pill">{step.travelLabel}</span>
                    <span className="hb-travel-bridge-line" />
                  </div>
                ) : (
                  <div
                    key={`s-${i}`}
                    className={`hb-route-stop ${
                      step.category === "lodging" ? "hb-route-stop--lodging" : ""
                    }`}
                  >
                    <div className="flex gap-3 rounded-lg bg-white/60 p-3">
                      <div className="hb-illus-frame h-14 w-14 shrink-0">
                        {step.imageUrl ? (
                          <Image
                            src={step.imageUrl}
                            alt={step.name}
                            fill
                            className="object-cover"
                            unoptimized
                            sizes="56px"
                          />
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center text-xl ${
                              step.category === "food"
                                ? "hb-watercolor-food"
                                : step.category === "lodging"
                                  ? "hb-watercolor-lodging"
                                  : "hb-watercolor-spot"
                            }`}
                          >
                            {step.category === "food"
                              ? "🍽"
                              : step.category === "lodging"
                                ? "🏨"
                                : "📍"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="hb-tag">
                            {step.category === "food"
                              ? "美食"
                              : step.category === "lodging"
                                ? step.lodgingRole === "start"
                                  ? "出發 · 住宿"
                                  : step.lodgingRole === "end"
                                    ? "返程 · 住宿"
                                    : "住宿"
                                : "景點"}
                          </span>
                          {step.time && (
                            <span className="text-[10px] text-[var(--hb-accent-route)]">
                              {step.time}
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 font-semibold">{step.name}</h4>
                        <p
                          {...editProps(`steps.${i}.guideNote`, step.guideNote)}
                          className="hb-body mt-0.5 text-xs"
                        >
                          {step.guideNote}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </BookPage>
      );

    case "transport":
      return (
        <BookPage>
          <div className="flex h-full flex-col p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <p className="hb-chapter-num">05</p>
              <div>
                <p className="hb-chapter-label">TRANSPORT</p>
                <h3 className="hb-section-title">交通方式總覽</h3>
              </div>
            </div>
            <p
              {...editProps("summary", slide.summary)}
              className="hb-body mt-5 text-base"
            >
              {slide.summary}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {slide.legs.map((leg) => (
                <div key={leg.mode} className="hb-stat flex items-center gap-4 px-4 py-4">
                  <span className="text-3xl">{leg.emoji}</span>
                  <div>
                    <p className="font-semibold">{leg.label}</p>
                    <p className="text-xs text-[var(--hb-ink-soft)]">
                      {leg.count} 段路程 · 合計約 {leg.totalMinutes} 分鐘
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BookPage>
      );

    case "overview":
      return (
        <BookPage>
          <div className="flex h-full flex-col items-center justify-center p-10 text-center">
            <p className="text-5xl opacity-60">🗺</p>
            <h3 className="hb-section-title mt-5">{slide.title}</h3>
            <p
              {...editProps("message", slide.message)}
              className="hb-body mt-4 max-w-sm"
            >
              {slide.message}
            </p>
          </div>
        </BookPage>
      );

    case "closing":
      return (
        <BookPage>
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[var(--hb-paper)] to-[var(--hb-paper-warm)] p-8 text-center">
            <p className="hb-chapter-label">SHARE</p>
            <h3 className="hb-section-title mt-2 text-2xl">{slide.title}</h3>
            <p className="mt-1 text-[var(--hb-ink-soft)]">{slide.destination}</p>
            <div className="mt-8 rounded-xl border-2 border-dashed border-[var(--hb-gold)] bg-white/50 px-10 py-6">
              <p className="text-xs tracking-widest text-[var(--hb-ink-soft)]">
                SEED CODE
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-[0.25em] text-[var(--hb-ink)]">
                {slide.seedCode}
              </p>
            </div>
            <p
              {...editProps("message", slide.message)}
              className="hb-body mt-6 max-w-xs text-sm"
            >
              {slide.message}
            </p>
          </div>
        </BookPage>
      );

    default:
      return null;
  }
}

function ChapterHeader({
  num,
  label,
  title,
  intro,
  accent,
  editing,
  onEdit,
}: {
  num: string;
  label: string;
  title: string;
  intro: string;
  accent: "food" | "spot";
  editing?: boolean;
  onEdit?: (path: string, value: string) => void;
}) {
  const editProps = (path: string, value: string) => ({
    className: "hb-editable",
    contentEditable: editing,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const next = e.currentTarget.textContent?.trim() ?? "";
      if (next !== value) onEdit?.(path, next);
    },
  });

  const accentColor =
    accent === "food" ? "var(--hb-accent-food)" : "var(--hb-accent-spot)";

  return (
    <div
      className="border-b border-[var(--hb-border)] px-6 py-4 sm:px-8"
      style={{
        background: `linear-gradient(135deg, var(--hb-paper-warm) 0%, var(--hb-paper) 60%)`,
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex items-start gap-4">
        <p className="hb-chapter-num text-4xl">{num}</p>
        <div>
          <p className="hb-chapter-label">{label}</p>
          <h3 className="hb-section-title">{title}</h3>
          <p {...editProps("intro", intro)} className="hb-body mt-2 text-sm">
            {intro}
          </p>
        </div>
      </div>
    </div>
  );
}

function TocItem({ label, page }: { label: string; page: string }) {
  return (
    <li className="hb-toc-item list-none">
      <span>{label}</span>
      <span className="hb-toc-dots" />
      <span className="text-[var(--hb-ink-soft)]">{page}</span>
    </li>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="hb-stat px-3 py-3 text-center">
      <p className="text-xl">{icon}</p>
      <p className="text-[10px] text-[var(--hb-accent)]">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function GuideCard({
  item,
  variant,
  editing,
  basePath,
  onEdit,
}: {
  item: import("@/types/trip-handbook").HandbookSpotCard;
  variant: "food" | "spot";
  editing?: boolean;
  basePath: string;
  onEdit?: (path: string, value: string) => void;
}) {
  const editProps = (path: string, value: string) => ({
    className: "hb-editable",
    contentEditable: editing,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const next = e.currentTarget.textContent?.trim() ?? "";
      if (next !== value) onEdit?.(`${basePath}.${path}`, next);
    },
  });

  return (
    <article
      className={`hb-guide-card ${variant === "food" ? "hb-guide-card--food" : "hb-guide-card--spot"}`}
    >
      <div className="grid grid-cols-3 gap-0">
        <div className="hb-illus-frame relative col-span-1 min-h-[100px]">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              unoptimized
              sizes="160px"
            />
          ) : (
            <div
              className={`flex h-full min-h-[100px] items-center justify-center text-3xl ${
                variant === "food" ? "hb-watercolor-food" : "hb-watercolor-spot"
              }`}
            >
              {variant === "food" ? "🍽" : "📍"}
            </div>
          )}
        </div>
        <div className="col-span-2 p-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold leading-tight">{item.name}</h4>
            {item.time && (
              <span className="text-[9px] text-[var(--hb-accent-route)]">
                {item.time}
              </span>
            )}
          </div>
          {item.area && (
            <span className="hb-tag mt-1">{item.area}</span>
          )}
          <p
            {...editProps("guideNote", item.guideNote)}
            className="hb-body mt-2 text-xs leading-relaxed"
          >
            {item.guideNote}
          </p>
          {item.mustTry && (
            <p className="mt-2 text-[10px] font-medium text-[var(--hb-accent-food)]">
              推薦：{item.mustTry}
            </p>
          )}
          {item.stayTip && (
            <p className="mt-2 text-[10px] text-[var(--hb-accent-spot)]">
              {item.stayTip}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

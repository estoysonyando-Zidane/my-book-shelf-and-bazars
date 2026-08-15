"use client";

import Link from "next/link";
import { InhabitantMark } from "@/components/Inhabitant";
import { computeSpineVisual, spineBackground } from "@/lib/spineStyle";
import { isCurrentlyLentOut, type BookListItem } from "@/lib/types";

const DUST_SPECKS =
  "radial-gradient(1px 1px at 20% 15%, rgba(230,225,210,0.9) 0, transparent 60%)," +
  "radial-gradient(1px 1px at 70% 35%, rgba(230,225,210,0.7) 0, transparent 60%)," +
  "radial-gradient(1px 1px at 40% 60%, rgba(230,225,210,0.8) 0, transparent 60%)," +
  "radial-gradient(1px 1px at 85% 75%, rgba(230,225,210,0.6) 0, transparent 60%)," +
  "radial-gradient(1px 1px at 15% 88%, rgba(230,225,210,0.7) 0, transparent 60%)";

export function BookSpine({
  book,
  inhabitantReadingHere,
  recentlyVisitedByInhabitant,
  rediscovered,
  dimmed,
  index = 0,
  hrefBase = "/books",
}: {
  book: BookListItem;
  inhabitantReadingHere?: boolean;
  recentlyVisitedByInhabitant?: boolean;
  rediscovered?: boolean;
  dimmed?: boolean;
  index?: number;
  hrefBase?: string;
}) {
  const { hue, widthPx, heightPx, dustLevel, tiltDeg, depthLevel, hasObi } = computeSpineVisual(book);
  const lentOut = isCurrentlyLentOut(book);

  return (
    <div
      className="relative shrink-0"
      style={{
        width: widthPx,
        transform: `rotate(${tiltDeg}deg)`,
        transformOrigin: "50% 100%",
        opacity: dimmed ? 0.18 : 1,
        transition: "opacity 0.4s ease",
      }}
      data-book-id={book.id}
    >
      {inhabitantReadingHere && (
        <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2">
          <InhabitantMark
            activity="READING"
            size={30}
            heldBookHue={hue}
            heldBookDustLevel={dustLevel}
          />
        </span>
      )}
      <Link
        href={`${hrefBase}/${book.id}`}
        title={`${book.title}${book.author ? " / " + book.author : ""}`}
        className={`group relative flex flex-col items-center overflow-hidden rounded-[2px] opacity-0 shadow-[0_6px_10px_rgba(0,0,0,0.45)] transition-transform [animation:spine-enter_0.5s_ease-out_forwards] hover:-translate-y-2 hover:shadow-[0_12px_18px_rgba(0,0,0,0.55)] ${rediscovered ? "ring-2 ring-accent [animation:spine-enter_0.5s_ease-out_forwards,rediscover-pulse_1.6s_ease-in-out_3]" : ""}`}
        style={{
          width: widthPx,
          height: heightPx,
          backgroundImage: spineBackground(hue, dustLevel, hasObi),
          animationDelay: `${Math.min(index * 25, 600)}ms`,
          filter: depthLevel > 0 ? `brightness(${1 - depthLevel * 0.22})` : undefined,
        }}
      >
        {dustLevel > 0.15 && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 [animation:dust-drift_11s_ease-in-out_infinite]"
            style={{ backgroundImage: DUST_SPECKS, opacity: dustLevel * 0.8 }}
          />
        )}
        {recentlyVisitedByInhabitant && (
          // さっきまで住人がここにいた、というほのかな余韻(数分かけて消える)
          <span
            key="afterglow"
            aria-hidden
            className="pointer-events-none absolute inset-0 [animation:inhabitant-afterglow_150s_ease-out_forwards]"
            style={{
              background:
                "radial-gradient(140% 60% at 50% 15%, rgba(217,164,65,0.35) 0%, transparent 70%)",
            }}
          />
        )}
        <div className="mt-3 min-h-0 flex-1 overflow-hidden px-0.5">
          <span
            className="text-[11px] font-serif leading-tight text-foreground/90"
            style={{ writingMode: "vertical-rl" }}
          >
            {book.title}
          </span>
        </div>
        {book.author && (
          <div className="mb-3 max-h-14 shrink-0 overflow-hidden">
            <span
              className="text-[9px] text-muted"
              style={{ writingMode: "vertical-rl" }}
            >
              {book.author}
            </span>
          </div>
        )}
        {lentOut && (
          <span className="absolute inset-x-0 top-0 bg-danger/80 py-0.5 text-center text-[9px] text-white">
            貸出中
          </span>
        )}
      </Link>
    </div>
  );
}

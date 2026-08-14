"use client";

import Link from "next/link";
import { InhabitantMark } from "@/components/Inhabitant";
import { computeSpineVisual, spineBackground } from "@/lib/spineStyle";
import { isCurrentlyLentOut, type BookListItem } from "@/lib/types";

export function BookSpine({
  book,
  inhabitantReadingHere,
}: {
  book: BookListItem;
  inhabitantReadingHere?: boolean;
}) {
  const { hue, widthPx, heightPx } = computeSpineVisual(book);
  const lentOut = isCurrentlyLentOut(book);

  return (
    <Link
      href={`/books/${book.id}`}
      title={`${book.title}${book.author ? " / " + book.author : ""}`}
      className="group relative shrink-0 flex flex-col items-center overflow-hidden rounded-[2px] shadow-[0_6px_10px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-2 hover:shadow-[0_12px_18px_rgba(0,0,0,0.55)]"
      style={{
        width: widthPx,
        height: heightPx,
        backgroundImage: spineBackground(hue),
      }}
    >
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
      {inhabitantReadingHere && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2">
          <InhabitantMark activity="READING" />
        </span>
      )}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookShelf } from "@/components/BookShelf";
import type { InhabitantActivity } from "@/components/Inhabitant";
import { ambienceLabel } from "@/lib/ambience";
import { isCurrentlyLentOut, type BookListItem } from "@/lib/types";

const AFTERGLOW_MS = 150_000;
const REDISCOVER_HIGHLIGHT_MS = 5_000;

const STATUS_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "UNREAD", label: "未読" },
  { value: "READING", label: "読書中" },
  { value: "FINISHED", label: "読了" },
] as const;

const SORT_OPTIONS = [
  { value: "createdAt", label: "登録順" },
  { value: "acquiredAt", label: "積読の古さ" },
  { value: "title", label: "タイトル" },
  { value: "author", label: "著者" },
  { value: "publishedYear", label: "出版年" },
  { value: "random", label: "ランダム" },
] as const;

const INHABITANT_POLL_MS = 45_000;

function seededShuffle<T>(items: T[], seed: number): T[] {
  let state = seed || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function HomePage() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inhabitant, setInhabitant] = useState<
    | {
        activity: InhabitantActivity;
        bookId: string | null;
        stateStartedAt?: string;
        recentlyLeftBookId?: string | null;
      }
    | undefined
  >(undefined);
  const prevInhabitantRef = useRef<{ activity: InhabitantActivity; bookId: string | null }>(
    { activity: "IDLE", bookId: null },
  );
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [lentOut, setLentOut] = useState(false);
  const [sort, setSort] = useState<string>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [rediscovering, setRediscovering] = useState(false);
  const [rediscoveredBookId, setRediscoveredBookId] = useState<string | null>(null);
  const [ambience, setAmbience] = useState("");

  // 検索・絞り込みは「棚から消す」のではなく「沈める(暗くする)」ため、
  // サーバーには並び順だけを渡し、常に全件を取得する
  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("sort", sort === "random" ? "createdAt" : sort);
    params.set("order", order);
    return params.toString();
  }, [sort, order]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/books?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          const list: BookListItem[] = data.books ?? [];
          setBooks(sort === "random" ? seededShuffle(list, shuffleSeed) : list);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, sort, shuffleSeed]);

  function matchesFilter(book: BookListItem): boolean {
    if (q) {
      const needle = q.toLowerCase();
      const haystack = `${book.title} ${book.author ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (status && book.readingStatus !== status) return false;
    if (lentOut && !isCurrentlyLentOut(book)) return false;
    return true;
  }

  const matchingCount = books.filter(matchesFilter).length;
  const hasActiveFilter = Boolean(q || status || lentOut);

  useEffect(() => {
    let cancelled = false;
    let afterglowTimeout: ReturnType<typeof setTimeout> | undefined;

    const loadInhabitant = () => {
      fetch("/api/inhabitant")
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;

          const next = { activity: data.activity as InhabitantActivity, bookId: data.book?.id ?? null };
          const prev = prevInhabitantRef.current;

          // 直前まで読んでいた本から離れたら、しばらく余韻(afterglow)を残す
          const justLeftBookId =
            prev.activity === "READING" &&
            prev.bookId &&
            (next.activity !== "READING" || next.bookId !== prev.bookId)
              ? prev.bookId
              : null;

          prevInhabitantRef.current = next;

          setInhabitant((current) => ({
            activity: next.activity,
            bookId: next.bookId,
            stateStartedAt: data.stateStartedAt,
            recentlyLeftBookId: justLeftBookId ?? current?.recentlyLeftBookId ?? null,
          }));

          if (justLeftBookId) {
            clearTimeout(afterglowTimeout);
            afterglowTimeout = setTimeout(() => {
              if (!cancelled) {
                setInhabitant((current) =>
                  current ? { ...current, recentlyLeftBookId: null } : current,
                );
              }
            }, AFTERGLOW_MS);
          }
        })
        .catch(() => {});
    };
    loadInhabitant();
    const interval = setInterval(loadInhabitant, INHABITANT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(afterglowTimeout);
    };
  }, []);

  useEffect(() => {
    const update = () => setAmbience(ambienceLabel());
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function handleRediscover() {
    setRediscovering(true);
    try {
      const res = await fetch("/api/books/rediscover");
      const data = await res.json();
      if (!data.book) return;

      // フィルタで沈んでいても存在は残っているので、検索条件はそのままでよい
      setRediscoveredBookId(data.book.id);

      requestAnimationFrame(() => {
        setTimeout(() => {
          document
            .querySelector(`[data-book-id="${data.book.id}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }, 300);
      });

      setTimeout(() => setRediscoveredBookId(null), REDISCOVER_HIGHLIGHT_MS);
    } finally {
      setRediscovering(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl text-foreground">積読の住処</h1>
        <nav className="flex items-center gap-4">
          <Link href="/invites" className="text-sm text-muted hover:text-foreground">
            同僚への招待
          </Link>
          <Link href="/reservations" className="text-sm text-muted hover:text-foreground">
            予約管理
          </Link>
          <Link
            href="/register"
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-[#1a1420] transition hover:brightness-110"
          >
            + 本を登録
          </Link>
        </nav>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded bg-background-elevated p-4 text-sm">
        <input
          type="search"
          placeholder="タイトル・著者で検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-48 flex-1 rounded border border-accent-soft/40 bg-background px-3 py-1.5 text-foreground outline-none focus:border-accent"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-accent-soft/40 bg-background px-2 py-1.5"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={lentOut}
            onChange={(e) => setLentOut(e.target.checked)}
          />
          貸出中のみ
        </label>
        <button
          type="button"
          onClick={handleRediscover}
          disabled={rediscovering}
          className="rounded border border-accent-soft/40 px-2 py-1.5 text-foreground hover:border-accent disabled:opacity-50"
        >
          積読を再発見
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded border border-accent-soft/40 bg-background px-2 py-1.5"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {sort === "random" ? (
          <button
            type="button"
            onClick={() => setShuffleSeed((s) => s + 1)}
            className="rounded border border-accent-soft/40 px-2 py-1.5 text-muted hover:text-foreground"
          >
            シャッフル
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
            className="rounded border border-accent-soft/40 px-2 py-1.5 text-muted hover:text-foreground"
          >
            {order === "asc" ? "昇順" : "降順"}
          </button>
        )}
        <span className="text-muted">
          {hasActiveFilter ? `${matchingCount} / ${books.length}冊` : `${books.length}冊`}
        </span>
      </div>

      {loading ? (
        <p className="p-10 text-center text-muted">読み込み中…</p>
      ) : (
        <BookShelf
          books={books}
          inhabitant={inhabitant}
          rediscoveredBookId={rediscoveredBookId}
          isDimmed={hasActiveFilter ? (book) => !matchesFilter(book) : undefined}
        />
      )}

      <footer className="mt-auto pb-2 text-xs text-muted">{ambience}</footer>
    </main>
  );
}

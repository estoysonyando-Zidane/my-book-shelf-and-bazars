"use client";

import { use, useEffect, useMemo, useState } from "react";
import { BookShelf } from "@/components/BookShelf";
import { ColleagueGate } from "@/components/ColleagueGate";
import type { InhabitantActivity } from "@/components/Inhabitant";
import { ambienceLabel } from "@/lib/ambience";
import { isCurrentlyLentOut, type BookListItem } from "@/lib/types";

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
] as const;

const INHABITANT_POLL_MS = 45_000;

export default function ColleagueShelfPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  return (
    <ColleagueGate token={token}>
      {(colleague) => <ColleagueShelf token={token} colleagueName={colleague.displayName} />}
    </ColleagueGate>
  );
}

function ColleagueShelf({ token, colleagueName }: { token: string; colleagueName: string }) {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inhabitant, setInhabitant] = useState<
    | { activity: InhabitantActivity; bookId: string | null; stateStartedAt?: string }
    | undefined
  >(undefined);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [lentOut, setLentOut] = useState(false);
  const [sort, setSort] = useState<string>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [ambience, setAmbience] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("sort", sort);
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
        if (!cancelled) setBooks(data.books ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const loadInhabitant = () => {
      fetch("/api/inhabitant")
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            setInhabitant({
              activity: data.activity,
              bookId: data.book?.id ?? null,
              stateStartedAt: data.stateStartedAt,
            });
          }
        })
        .catch(() => {});
    };
    loadInhabitant();
    const interval = setInterval(loadInhabitant, INHABITANT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const update = () => setAmbience(ambienceLabel());
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl text-foreground">積読の住処</h1>
        <span className="text-sm text-muted">{colleagueName} さん、こんにちは</span>
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
        <button
          type="button"
          onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
          className="rounded border border-accent-soft/40 px-2 py-1.5 text-muted hover:text-foreground"
        >
          {order === "asc" ? "昇順" : "降順"}
        </button>
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
          isDimmed={hasActiveFilter ? (book) => !matchesFilter(book) : undefined}
          hrefBase={`/c/${token}/books`}
        />
      )}

      <footer className="mt-auto pb-2 text-xs text-muted">{ambience}</footer>
    </main>
  );
}

"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ColleagueGate } from "@/components/ColleagueGate";
import type { BookDetail } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  UNREAD: "未読",
  READING: "読書中",
  FINISHED: "読了",
};

export default function ColleagueBookDetailPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = use(params);

  return (
    <ColleagueGate token={token}>
      {(colleague) => (
        <BookDetailForColleague token={token} bookId={id} colleagueName={colleague.displayName} />
      )}
    </ColleagueGate>
  );
}

function BookDetailForColleague({
  token,
  bookId,
  colleagueName,
}: {
  token: string;
  bookId: string;
  colleagueName: string;
}) {
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [reserveMessage, setReserveMessage] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");

  async function reload() {
    const res = await fetch(`/api/books/${bookId}`);
    if (res.ok) {
      const data = await res.json();
      setBook(data.book);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  async function handleReserve() {
    setReserving(true);
    setReserveMessage(null);
    try {
      const res = await fetch(`/api/books/${bookId}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colleagueToken: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReserveMessage(data.error ?? "予約に失敗しました");
        return;
      }
      setReserveMessage(data.duplicate ? "すでに予約済みです" : "予約しました");
      reload();
    } finally {
      setReserving(false);
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    await fetch(`/api/books/${bookId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: colleagueName,
        authorType: "COLLEAGUE",
        body: commentBody,
      }),
    });
    setCommentBody("");
    reload();
  }

  if (loading) {
    return <p className="p-10 text-center text-muted">読み込み中…</p>;
  }
  if (!book) {
    return <p className="p-10 text-center text-muted">見つかりませんでした</p>;
  }

  const activeLoan = book.loans.find((l) => l.returnedAt === null);
  const alreadyReservedByMe = book.reservations.some((r) => r.reservedByName === colleagueName);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href={`/c/${token}`} className="text-sm text-muted hover:text-foreground">
        ← 本棚に戻る
      </Link>

      <div className="flex gap-6 rounded bg-background-elevated p-5">
        {book.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="h-48 w-32 shrink-0 rounded object-cover shadow-lg"
          />
        )}
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="font-serif text-2xl">{book.title}</h1>
          {book.author && <p className="text-muted">{book.author}</p>}
          <p className="text-sm text-muted">
            {[book.publisher, book.publishedYear && `${book.publishedYear}年`]
              .filter(Boolean)
              .join(" / ")}
          </p>
          <p className="text-xs text-muted">
            読書ステータス: {STATUS_LABEL[book.readingStatus]}
          </p>
          {activeLoan && <p className="text-xs text-danger">貸出中です</p>}
          {book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {book.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-accent-soft/30 px-2 py-0.5 text-xs text-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={handleReserve}
              disabled={reserving || alreadyReservedByMe}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-[#1a1420] disabled:opacity-50"
            >
              {alreadyReservedByMe ? "予約済み" : "予約する"}
            </button>
            {reserveMessage && <span className="text-xs text-muted">{reserveMessage}</span>}
          </div>
          {book.reservations.length > 0 && (
            <p className="text-xs text-muted">
              予約中: {book.reservations.map((r) => r.reservedByName).join(", ")}
            </p>
          )}
        </div>
      </div>

      <section className="rounded bg-background-elevated p-5">
        <h2 className="mb-3 font-serif text-lg">感想・コメント</h2>
        <form onSubmit={postComment} className="mb-4 flex gap-2 text-sm">
          <input
            placeholder="コメント"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            className="input flex-1"
          />
          <button
            type="submit"
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-[#1a1420]"
          >
            投稿
          </button>
        </form>
        <ul className="flex flex-col gap-3">
          {book.comments.map((c) => (
            <li key={c.id} className="text-sm">
              <p className="text-foreground">{c.body}</p>
              <p className="text-xs text-muted">
                {c.authorName} ・ {new Date(c.createdAt).toLocaleString("ja-JP")}
              </p>
            </li>
          ))}
          {book.comments.length === 0 && (
            <p className="text-sm text-muted">まだコメントはありません</p>
          )}
        </ul>
      </section>
    </main>
  );
}

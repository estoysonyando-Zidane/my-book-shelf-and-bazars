"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { BookDetail } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  UNREAD: "未読",
  READING: "読書中",
  FINISHED: "読了",
};

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowerName, setBorrowerName] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const res = await fetch(`/api/books/${id}`);
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
  }, [id]);

  async function updateStatus(status: string) {
    await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readingStatus: status }),
    });
    reload();
  }

  async function lendOut(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/books/${id}/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        borrowerName,
        dueAt: dueAt || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "貸出登録に失敗しました");
      return;
    }
    setBorrowerName("");
    setDueAt("");
    reload();
  }

  async function returnLoan(loanId: string) {
    await fetch(`/api/loans/${loanId}`, { method: "PATCH" });
    reload();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentName.trim() || !commentBody.trim()) return;
    await fetch(`/api/books/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: commentName, body: commentBody }),
    });
    setCommentBody("");
    reload();
  }

  async function deleteBook() {
    if (!confirm("この本を削除しますか?")) return;
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (loading) {
    return <p className="p-10 text-center text-muted">読み込み中…</p>;
  }
  if (!book) {
    return <p className="p-10 text-center text-muted">見つかりませんでした</p>;
  }

  const activeLoan = book.loans.find((l) => l.returnedAt === null);
  const overdue = activeLoan?.dueAt ? new Date(activeLoan.dueAt) < new Date() : false;
  const tsundokuDays = book.readingStatus === "UNREAD" ? daysSince(String(book.acquiredAt)) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
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
          {book.isbn && <p className="text-xs text-muted">ISBN: {book.isbn}</p>}
          <p className="text-xs text-muted">所持数: {book.ownedCount}</p>
          {tsundokuDays !== null && (
            <p className="text-xs text-accent">積読 {tsundokuDays}日目</p>
          )}
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
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted">読書ステータス:</span>
            <select
              value={book.readingStatus}
              onChange={(e) => updateStatus(e.target.value)}
              className="input"
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="rounded bg-background-elevated p-5">
        <h2 className="mb-3 font-serif text-lg">貸出</h2>
        {activeLoan ? (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p>
                貸出先: {activeLoan.borrowerName}
                {overdue && <span className="ml-2 text-danger">超過</span>}
              </p>
              <p className="text-muted">
                貸出日: {new Date(activeLoan.loanedAt).toLocaleDateString("ja-JP")}
                {activeLoan.dueAt &&
                  ` / 返却予定: ${new Date(activeLoan.dueAt).toLocaleDateString("ja-JP")}`}
              </p>
            </div>
            <button
              onClick={() => returnLoan(activeLoan.id)}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-[#1a1420]"
            >
              返却する
            </button>
          </div>
        ) : (
          <form onSubmit={lendOut} className="flex flex-wrap items-end gap-2 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-muted">貸出先</span>
              <input
                required
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted">返却予定日</span>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="input"
              />
            </label>
            <button
              type="submit"
              className="rounded border border-accent-soft/40 px-3 py-1.5 text-foreground"
            >
              貸し出す
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </section>

      <section className="rounded bg-background-elevated p-5">
        <h2 className="mb-3 font-serif text-lg">感想・コメント</h2>
        <form onSubmit={postComment} className="mb-4 flex flex-col gap-2 text-sm">
          <div className="flex gap-2">
            <input
              placeholder="名前"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              className="input w-32"
            />
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
          </div>
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

      <button
        onClick={deleteBook}
        className="self-start text-xs text-danger/80 hover:text-danger"
      >
        この本を削除する
      </button>
    </main>
  );
}

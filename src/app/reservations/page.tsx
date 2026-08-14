"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Reservation = {
  id: string;
  reservedByName: string;
  reservedAt: string;
  book: { id: string; title: string; author: string | null };
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const res = await fetch("/api/reservations");
    const data = await res.json();
    setReservations(data.reservations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, []);

  async function updateStatus(id: string, status: "FULFILLED" | "CANCELLED") {
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    reload();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-foreground">予約管理</h1>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← 本棚に戻る
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-muted">読み込み中…</p>
      ) : reservations.length === 0 ? (
        <p className="text-sm text-muted">今のところ予約はありません。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reservations.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded bg-background-elevated p-4 text-sm"
            >
              <div>
                <Link href={`/books/${r.book.id}`} className="text-foreground hover:text-accent">
                  {r.book.title}
                </Link>
                <p className="text-xs text-muted">
                  {r.reservedByName} ・ {new Date(r.reservedAt).toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "FULFILLED")}
                  className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-[#1a1420]"
                >
                  渡した
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(r.id, "CANCELLED")}
                  className="rounded border border-accent-soft/40 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  取り消し
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

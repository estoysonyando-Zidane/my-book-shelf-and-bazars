"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Colleague = {
  id: string;
  displayName: string;
  inviteToken: string;
  createdAt: string;
  revokedAt: string | null;
};

export default function InvitesPage() {
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  async function reload() {
    const res = await fetch("/api/colleagues");
    const data = await res.json();
    setColleagues(data.colleagues ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      await fetch("/api/colleagues", { method: "POST" });
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(token: string) {
    await fetch(`/api/colleagues/${token}/revoke`, { method: "POST" });
    reload();
  }

  async function copyLink(token: string) {
    const link = `${origin}/c/${token}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // クリップボードが使えない環境ではリンクを表示するだけでよい
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-foreground">同僚への招待</h1>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← 本棚に戻る
        </Link>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="self-start rounded bg-accent px-4 py-2 text-sm font-medium text-[#1a1420] disabled:opacity-50"
      >
        + 招待リンクを発行
      </button>

      {loading ? (
        <p className="text-center text-muted">読み込み中…</p>
      ) : colleagues.length === 0 ? (
        <p className="text-sm text-muted">まだ招待はありません。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {colleagues.map((c) => {
            const link = `${origin}/c/${c.inviteToken}`;
            return (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded bg-background-elevated p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-foreground">
                    {c.displayName || "(名前未設定)"}
                  </span>
                  <span className="text-xs text-muted">
                    発行日: {new Date(c.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs text-muted">
                    {link}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyLink(c.inviteToken)}
                    className="rounded border border-accent-soft/40 px-2 py-1 text-xs text-foreground hover:border-accent"
                  >
                    コピー
                  </button>
                  {c.revokedAt ? (
                    <span className="text-xs text-danger">失効済み</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRevoke(c.inviteToken)}
                      className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:border-danger"
                    >
                      失効させる
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

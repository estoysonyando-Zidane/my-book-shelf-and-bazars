"use client";

import { useEffect, useState } from "react";

export type Colleague = {
  id: string;
  displayName: string;
  inviteToken: string;
  revokedAt: string | null;
};

// 招待リンクでのアクセスを共通で扱う。
// 初回は名前だけ設定させ、以降は同じリンクなら同じ名前が使われる。
// パスワード等の本格的な会員登録は行わない。
export function ColleagueGate({
  token,
  children,
}: {
  token: string;
  children: (colleague: Colleague) => React.ReactNode;
}) {
  const [colleague, setColleague] = useState<Colleague | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/colleagues/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "このリンクは無効です");
          return;
        }
        setColleague(data.colleague);
      })
      .catch(() => setError("読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSetName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/colleagues/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "設定に失敗しました");
        return;
      }
      setColleague(data.colleague);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-10 text-center text-muted">読み込み中…</p>;
  }

  if (error || !colleague) {
    return (
      <p className="p-10 text-center text-muted">
        {error ?? "このリンクは無効です"}
      </p>
    );
  }

  if (!colleague.displayName) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-8">
        <h1 className="font-serif text-xl text-foreground">はじめまして</h1>
        <p className="text-sm text-muted">
          お名前を教えてください。以降このリンクからは同じ名前で表示されます。
        </p>
        <form onSubmit={handleSetName} className="flex gap-2">
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="お名前"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-[#1a1420] disabled:opacity-50"
          >
            すすむ
          </button>
        </form>
      </main>
    );
  }

  return <>{children(colleague)}</>;
}

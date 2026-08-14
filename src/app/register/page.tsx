"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookLookupResult } from "@/lib/bookLookup";

type ExistingBook = { id: string; title: string; ownedCount: number } | null;

const emptyForm = {
  isbn: "",
  title: "",
  author: "",
  publisher: "",
  publishedYear: "",
  pageCount: "",
  coverImageUrl: "",
  measuredWidthMm: "",
  measuredHeightMm: "",
  measuredDepthMm: "",
  manualTags: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [isbnQuery, setIsbnQuery] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [existing, setExisting] = useState<ExistingBook>(null);
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function applyLookupResult(result: BookLookupResult) {
    setForm((f) => ({
      ...f,
      isbn: result.isbn ?? f.isbn,
      title: result.title,
      author: result.author ?? "",
      publisher: result.publisher ?? "",
      publishedYear: result.publishedYear ? String(result.publishedYear) : "",
      pageCount: result.pageCount ? String(result.pageCount) : "",
      coverImageUrl: result.coverImageUrl ?? "",
    }));
    setAutoTags(result.categories);
  }

  async function runLookup(params: URLSearchParams) {
    setSearching(true);
    setSearchError(null);
    setExisting(null);
    try {
      const res = await fetch(`/api/books/lookup?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "見つかりませんでした");
        return;
      }
      applyLookupResult(data.result);
      setExisting(data.existing);
    } catch {
      setSearchError("検索に失敗しました");
    } finally {
      setSearching(false);
    }
  }

  async function handleIsbnSearch() {
    if (!isbnQuery.trim()) return;
    await runLookup(new URLSearchParams({ isbn: isbnQuery.trim() }));
  }

  async function handleKeywordSearch() {
    if (!keywordQuery.trim()) return;
    await runLookup(new URLSearchParams({ q: keywordQuery.trim() }));
  }

  async function incrementExisting() {
    if (!existing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: form.isbn, title: form.title }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/books/${data.book.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn: form.isbn || null,
          title: form.title,
          author: form.author || null,
          publisher: form.publisher || null,
          publishedYear: form.publishedYear ? Number(form.publishedYear) : null,
          pageCount: form.pageCount ? Number(form.pageCount) : null,
          coverImageUrl: form.coverImageUrl || null,
          measuredWidthMm: form.measuredWidthMm ? Number(form.measuredWidthMm) : null,
          measuredHeightMm: form.measuredHeightMm ? Number(form.measuredHeightMm) : null,
          measuredDepthMm: form.measuredDepthMm ? Number(form.measuredDepthMm) : null,
          manualTagNames: form.manualTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          autoTagNames: autoTags,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage(data.error ?? "登録に失敗しました");
        return;
      }
      router.push(`/books/${data.book.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-foreground">本を登録</h1>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← 本棚に戻る
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded bg-background-elevated p-4">
        <div className="flex gap-2">
          <input
            placeholder="ISBNを入力(バーコードの数字)"
            value={isbnQuery}
            onChange={(e) => setIsbnQuery(e.target.value)}
            className="flex-1 rounded border border-accent-soft/40 bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleIsbnSearch}
            disabled={searching}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-[#1a1420] disabled:opacity-50"
          >
            ISBNで検索
          </button>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="書名・著者で検索"
            value={keywordQuery}
            onChange={(e) => setKeywordQuery(e.target.value)}
            className="flex-1 rounded border border-accent-soft/40 bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleKeywordSearch}
            disabled={searching}
            className="rounded border border-accent-soft/40 px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
          >
            検索
          </button>
        </div>
        {searching && <p className="text-sm text-muted">検索中…</p>}
        {searchError && <p className="text-sm text-danger">{searchError}</p>}
        {existing && (
          <div className="flex items-center justify-between rounded border border-accent/50 bg-accent/10 px-3 py-2 text-sm">
            <span>
              「{existing.title}」は既に登録されています(所持数: {existing.ownedCount})
            </span>
            <button
              type="button"
              onClick={incrementExisting}
              disabled={saving}
              className="rounded bg-accent px-3 py-1 text-xs font-medium text-[#1a1420]"
            >
              所持数を+1する
            </button>
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded bg-background-elevated p-4">
        <h2 className="text-sm text-muted">書誌情報(手入力・編集可)</h2>
        <Field label="タイトル *">
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="著者">
          <input
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="出版社">
            <input
              value={form.publisher}
              onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="出版年">
            <input
              type="number"
              value={form.publishedYear}
              onChange={(e) => setForm((f) => ({ ...f, publishedYear: e.target.value }))}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="実測 幅(mm)">
            <input
              type="number"
              value={form.measuredWidthMm}
              onChange={(e) => setForm((f) => ({ ...f, measuredWidthMm: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="実測 高さ(mm)">
            <input
              type="number"
              value={form.measuredHeightMm}
              onChange={(e) => setForm((f) => ({ ...f, measuredHeightMm: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="実測 厚み(mm)">
            <input
              type="number"
              value={form.measuredDepthMm}
              onChange={(e) => setForm((f) => ({ ...f, measuredDepthMm: e.target.value }))}
              className="input"
            />
          </Field>
        </div>
        <Field label="タグ(カンマ区切り)">
          <input
            value={form.manualTags}
            onChange={(e) => setForm((f) => ({ ...f, manualTags: e.target.value }))}
            className="input"
          />
        </Field>
        {autoTags.length > 0 && (
          <p className="text-xs text-muted">自動設定されるタグ: {autoTags.join(" / ")}</p>
        )}
        {saveMessage && <p className="text-sm text-danger">{saveMessage}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded bg-accent px-4 py-2 text-sm font-medium text-[#1a1420] disabled:opacity-50"
        >
          {saving ? "登録中…" : "この内容で登録する"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

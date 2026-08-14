// 住人の自律行動シミュレーション(docs/requirements.md 3.6, docs/design.md InhabitantState)
// サーバー側で状態を一元管理し、アクセスのたびに経過時間から状態を導出(必要なら遷移を進める)。

import { prisma } from "@/lib/prisma";

const MINUTE = 60_000;

type NextPlan = {
  activity: "IDLE" | "READING" | "NAPPING" | "CARRYING";
  durationMs: number;
  needsBook: boolean;
};

function randomBetween(minMinutes: number, maxMinutes: number): number {
  return (minMinutes + Math.random() * (maxMinutes - minMinutes)) * MINUTE;
}

function pickNextActivity(): NextPlan {
  const roll = Math.random();

  if (roll < 0.3) {
    return { activity: "IDLE", durationMs: randomBetween(1, 6), needsBook: false };
  }
  if (roll < 0.6) {
    return { activity: "READING", durationMs: randomBetween(5, 45), needsBook: true };
  }
  if (roll < 0.8) {
    return { activity: "NAPPING", durationMs: randomBetween(10, 40), needsBook: false };
  }

  // CARRYING: 稀に長時間(数時間〜十数日)持ち込んだまま忘れることがある
  const forgets = Math.random() < 0.35;
  const durationMs = forgets
    ? randomBetween(6 * 60, 20 * 24 * 60)
    : randomBetween(30, 4 * 60);
  return { activity: "CARRYING", durationMs, needsBook: true };
}

// その蔵書の中で一番多いタグ = 住人の「好み」として、選ぶ確率にだけ反映する。
// UI上には一切出さない(本人にも説明できないような、滲み出るだけの嗜好)。
async function getFavoriteTagId(): Promise<string | null> {
  const grouped = await prisma.bookTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 1,
  });
  return grouped[0]?.tagId ?? null;
}

function weightedPick(
  candidates: { id: string; tags: { tagId: string }[] }[],
  favoriteTagId: string | null,
): string | null {
  if (candidates.length === 0) return null;
  const pool: string[] = [];
  for (const c of candidates) {
    const isFavorite = favoriteTagId && c.tags.some((t) => t.tagId === favoriteTagId);
    pool.push(c.id, ...(isFavorite ? [c.id, c.id] : []));
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

async function pickBookForInhabitant(
  excludeId: string | null,
  favoriteTagId: string | null,
): Promise<string | null> {
  // 「忘れられた本」への気づきを促す役割のため、積読の古い本を優先的に選ぶ
  const preferNeglected = Math.random() < 0.7;

  const base = {
    loans: { none: { returnedAt: null } },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };

  if (preferNeglected) {
    const candidates = await prisma.book.findMany({
      where: { ...base, readingStatus: "UNREAD" },
      orderBy: { acquiredAt: "asc" },
      take: 20,
      select: { id: true, tags: { select: { tagId: true } } },
    });
    const picked = weightedPick(candidates, favoriteTagId);
    if (picked) return picked;
  }

  const count = await prisma.book.count({ where: base });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  const [book] = await prisma.book.findMany({
    where: base,
    take: 1,
    skip,
    select: { id: true },
  });
  return book?.id ?? null;
}

const MAX_CATCHUP_STEPS = 40;

export async function getOrAdvanceInhabitantState() {
  let state = await prisma.inhabitantState.findFirst();

  if (!state) {
    state = await prisma.inhabitantState.create({
      data: {
        activity: "IDLE",
        location: "SHELF",
        nextTransitionAt: new Date(Date.now() + randomBetween(1, 4)),
      },
    });
  }

  let steps = 0;
  const now = Date.now();
  let favoriteTagId: string | null | undefined;

  while (state.nextTransitionAt.getTime() <= now && steps < MAX_CATCHUP_STEPS) {
    const plan = pickNextActivity();
    if (plan.needsBook && favoriteTagId === undefined) {
      favoriteTagId = await getFavoriteTagId();
    }
    const bookId: string | null = plan.needsBook
      ? await pickBookForInhabitant(state.currentBookId, favoriteTagId ?? null)
      : null;

    state = await prisma.inhabitantState.update({
      where: { id: state.id },
      data: {
        activity: plan.activity,
        currentBookId: bookId,
        location: plan.activity === "CARRYING" ? "ROOM" : "SHELF",
        stateStartedAt: new Date(),
        nextTransitionAt: new Date(
          Math.max(now, state.nextTransitionAt.getTime()) + plan.durationMs,
        ),
      },
    });
    steps += 1;
  }

  return state;
}

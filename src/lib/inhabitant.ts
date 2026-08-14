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

async function pickBookForInhabitant(excludeId: string | null): Promise<string | null> {
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
      select: { id: true },
    });
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)].id;
    }
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

  while (state.nextTransitionAt.getTime() <= now && steps < MAX_CATCHUP_STEPS) {
    const plan = pickNextActivity();
    const bookId: string | null = plan.needsBook
      ? await pickBookForInhabitant(state.currentBookId)
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

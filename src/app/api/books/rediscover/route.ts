import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/books/rediscover
// ユーザーが能動的に「積読を再発見」できるボタン用。
// 積読が長い(登録から時間が経っている未読)本を優先してランダムに1冊返す。
export async function GET() {
  const base = {
    readingStatus: "UNREAD" as const,
    loans: { none: { returnedAt: null } },
  };

  const candidates = await prisma.book.findMany({
    where: base,
    orderBy: { acquiredAt: "asc" },
    take: 20,
    select: { id: true, title: true },
  });

  if (candidates.length > 0) {
    const book = candidates[Math.floor(Math.random() * candidates.length)];
    return NextResponse.json({ book });
  }

  const count = await prisma.book.count();
  if (count === 0) {
    return NextResponse.json({ book: null });
  }
  const skip = Math.floor(Math.random() * count);
  const [book] = await prisma.book.findMany({
    take: 1,
    skip,
    select: { id: true, title: true },
  });
  return NextResponse.json({ book: book ?? null });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/reservations — オーナー向け予約管理一覧(有効な予約のみ)
export async function GET() {
  const reservations = await prisma.reservation.findMany({
    where: { status: "ACTIVE" },
    orderBy: { reservedAt: "asc" },
    include: { book: { select: { id: true, title: true, author: true } } },
  });
  return NextResponse.json({ reservations });
}

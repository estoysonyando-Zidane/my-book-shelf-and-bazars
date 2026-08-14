import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/books/:id/reservations — 同僚による予約
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = (await req.json()) as { colleagueToken?: string };

  if (!body.colleagueToken) {
    return NextResponse.json({ error: "招待リンクが必要です" }, { status: 400 });
  }

  const colleague = await prisma.colleague.findUnique({
    where: { inviteToken: body.colleagueToken },
  });
  if (!colleague || colleague.revokedAt || !colleague.displayName) {
    return NextResponse.json({ error: "このリンクは無効です" }, { status: 404 });
  }

  const existing = await prisma.reservation.findFirst({
    where: { bookId: id, reservedByColleagueId: colleague.id, status: "ACTIVE" },
  });
  if (existing) {
    return NextResponse.json({ reservation: existing, duplicate: true });
  }

  const reservation = await prisma.reservation.create({
    data: {
      bookId: id,
      reservedByName: colleague.displayName,
      reservedByColleagueId: colleague.id,
    },
  });

  return NextResponse.json({ reservation, duplicate: false }, { status: 201 });
}

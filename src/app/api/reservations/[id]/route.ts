import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/reservations/:id — オーナーが渡した/取り消したを記録する
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = (await req.json()) as { status: "FULFILLED" | "CANCELLED" };

  if (body.status !== "FULFILLED" && body.status !== "CANCELLED") {
    return NextResponse.json({ error: "不正なステータスです" }, { status: 400 });
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json({ reservation });
}

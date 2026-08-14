import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/loans/:id — 返却登録(returnedAtをセット)
export async function PATCH(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const loan = await prisma.loan.update({
    where: { id },
    data: { returnedAt: new Date() },
  });

  return NextResponse.json({ loan });
}

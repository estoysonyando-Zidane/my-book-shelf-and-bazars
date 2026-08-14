import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ token: string }> };

// POST /api/colleagues/:token/revoke — オーナーが招待を失効させる
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const colleague = await prisma.colleague.update({
    where: { inviteToken: token },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ colleague });
}

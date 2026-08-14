import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/colleagues — オーナー向け招待一覧
export async function GET() {
  const colleagues = await prisma.colleague.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ colleagues });
}

// POST /api/colleagues — 新しい招待を発行(名前は同僚が初回アクセス時に設定する)
export async function POST() {
  const inviteToken = randomBytes(12).toString("base64url");
  const colleague = await prisma.colleague.create({
    data: { displayName: "", inviteToken },
  });
  return NextResponse.json({ colleague }, { status: 201 });
}

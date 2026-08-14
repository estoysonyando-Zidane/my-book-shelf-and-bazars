import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/colleagues/:token — 同僚本人が自分の招待状態を確認する(公開)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const colleague = await prisma.colleague.findUnique({ where: { inviteToken: token } });

  if (!colleague || colleague.revokedAt) {
    return NextResponse.json({ error: "このリンクは無効です" }, { status: 404 });
  }

  return NextResponse.json({ colleague });
}

// PATCH /api/colleagues/:token — 初回アクセス時の名前設定
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const body = (await req.json()) as { displayName?: string };

  if (!body.displayName?.trim()) {
    return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
  }

  const existing = await prisma.colleague.findUnique({ where: { inviteToken: token } });
  if (!existing || existing.revokedAt) {
    return NextResponse.json({ error: "このリンクは無効です" }, { status: 404 });
  }

  const colleague = await prisma.colleague.update({
    where: { inviteToken: token },
    data: { displayName: body.displayName.trim() },
  });

  return NextResponse.json({ colleague });
}

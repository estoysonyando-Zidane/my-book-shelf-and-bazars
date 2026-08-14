import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type CreateCommentBody = {
  authorName: string;
  authorType?: "OWNER" | "COLLEAGUE";
  body: string;
};

// POST /api/books/:id/comments — 感想・コメント投稿(新しい順に並ぶ)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const payload = (await req.json()) as CreateCommentBody;

  if (!payload.authorName?.trim() || !payload.body?.trim()) {
    return NextResponse.json(
      { error: "名前と本文は必須です" },
      { status: 400 },
    );
  }

  const comment = await prisma.comment.create({
    data: {
      bookId: id,
      authorName: payload.authorName,
      authorType: payload.authorType ?? "OWNER",
      body: payload.body,
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

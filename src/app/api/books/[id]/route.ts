import { NextRequest, NextResponse } from "next/server";
import { ReadingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      loans: { orderBy: { loanedAt: "desc" } },
      comments: { orderBy: { createdAt: "desc" } },
      reservations: { where: { status: "ACTIVE" } },
    },
  });

  if (!book) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ book });
}

type UpdateBookBody = {
  title?: string;
  author?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  pageCount?: number | null;
  coverImageUrl?: string | null;
  measuredWidthMm?: number | null;
  measuredHeightMm?: number | null;
  measuredDepthMm?: number | null;
  ownedCount?: number;
  readingStatus?: ReadingStatus;
  manualTagNames?: string[];
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = (await req.json()) as UpdateBookBody;

  const data: Record<string, unknown> = {};
  for (const key of [
    "title",
    "author",
    "publisher",
    "publishedYear",
    "pageCount",
    "coverImageUrl",
    "measuredWidthMm",
    "measuredHeightMm",
    "measuredDepthMm",
    "ownedCount",
    "readingStatus",
  ] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (body.manualTagNames) {
    await prisma.bookTag.deleteMany({
      where: { bookId: id, tag: { source: "MANUAL" } },
    });
    data.tags = {
      create: body.manualTagNames.map((name) => ({
        tag: {
          connectOrCreate: {
            where: { name },
            create: { name, source: "MANUAL" as const },
          },
        },
      })),
    };
  }

  const book = await prisma.book.update({
    where: { id },
    data,
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({ book });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await prisma.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReadingStatus } from "@/generated/prisma/client";
import { getOrAdvanceInhabitantState } from "@/lib/inhabitant";
import { prisma } from "@/lib/prisma";

const SORTABLE_FIELDS = [
  "title",
  "author",
  "acquiredAt",
  "publishedYear",
  "createdAt",
] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

// GET /api/books?q=&tag=&status=&lentOut=&sort=&order=
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q");
  const tags = params.getAll("tag");
  const status = params.get("status");
  const lentOut = params.get("lentOut");
  const sortParam = params.get("sort") as SortableField | null;
  const order = params.get("order") === "desc" ? "desc" : "asc";

  const where: Prisma.BookWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
    ];
  }

  if (tags.length > 0) {
    where.tags = { some: { tag: { name: { in: tags } } } };
  }

  if (
    status &&
    (Object.values(ReadingStatus) as string[]).includes(status)
  ) {
    where.readingStatus = status as ReadingStatus;
  }

  if (lentOut === "true") {
    where.loans = { some: { returnedAt: null } };
  } else if (lentOut === "false") {
    where.loans = { none: { returnedAt: null } };
  }

  // 住人が部屋に持ち込んでいる本は棚から消える(要件3.6)
  const inhabitant = await getOrAdvanceInhabitantState();
  if (inhabitant.location === "ROOM" && inhabitant.currentBookId) {
    where.id = { not: inhabitant.currentBookId };
  }

  const sort: SortableField =
    sortParam && SORTABLE_FIELDS.includes(sortParam) ? sortParam : "createdAt";

  const books = await prisma.book.findMany({
    where,
    orderBy: { [sort]: order },
    include: {
      tags: { include: { tag: true } },
      loans: { where: { returnedAt: null } },
    },
  });

  return NextResponse.json({ books });
}

type CreateBookBody = {
  isbn?: string | null;
  title: string;
  author?: string | null;
  publisher?: string | null;
  publishedYear?: number | null;
  pageCount?: number | null;
  coverImageUrl?: string | null;
  measuredWidthMm?: number | null;
  measuredHeightMm?: number | null;
  measuredDepthMm?: number | null;
  ownedCount?: number;
  manualTagNames?: string[];
  autoTagNames?: string[];
};

// POST /api/books
// isbnが既存本と一致する場合は新規作成せず所持数をインクリメントする(重複登録対策)
export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateBookBody;

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "タイトルは必須です" },
      { status: 400 },
    );
  }

  if (body.isbn) {
    const existing = await prisma.book.findUnique({
      where: { isbn: body.isbn },
    });
    if (existing) {
      const updated = await prisma.book.update({
        where: { id: existing.id },
        data: { ownedCount: existing.ownedCount + (body.ownedCount ?? 1) },
      });
      return NextResponse.json({ book: updated, duplicate: true });
    }
  }

  const manualTags = (body.manualTagNames ?? []).map((name) => ({
    name,
    source: "MANUAL" as const,
  }));
  const autoTags = (body.autoTagNames ?? []).map((name) => ({
    name,
    source: "AUTO" as const,
  }));
  const allTags = [...manualTags, ...autoTags];

  const book = await prisma.book.create({
    data: {
      isbn: body.isbn || null,
      title: body.title,
      author: body.author || null,
      publisher: body.publisher || null,
      publishedYear: body.publishedYear ?? null,
      pageCount: body.pageCount ?? null,
      coverImageUrl: body.coverImageUrl || null,
      measuredWidthMm: body.measuredWidthMm ?? null,
      measuredHeightMm: body.measuredHeightMm ?? null,
      measuredDepthMm: body.measuredDepthMm ?? null,
      ownedCount: body.ownedCount ?? 1,
      tags: {
        create: allTags.map(({ name, source }) => ({
          tag: {
            connectOrCreate: {
              where: { name },
              create: { name, source },
            },
          },
        })),
      },
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({ book, duplicate: false }, { status: 201 });
}

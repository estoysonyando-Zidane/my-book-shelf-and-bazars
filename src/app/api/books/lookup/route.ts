import { NextRequest, NextResponse } from "next/server";
import { lookupByIsbn, searchByKeyword } from "@/lib/bookLookup";
import { prisma } from "@/lib/prisma";

// GET /api/books/lookup?isbn=... または ?q=...
// 書誌情報を外部APIから取得する(まだDBには保存しない)
export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get("isbn");
  const q = req.nextUrl.searchParams.get("q");

  if (!isbn && !q) {
    return NextResponse.json(
      { error: "isbn または q を指定してください" },
      { status: 400 },
    );
  }

  const result = isbn ? await lookupByIsbn(isbn) : await searchByKeyword(q!);

  if (!result) {
    return NextResponse.json(
      { error: "書誌情報が見つかりませんでした" },
      { status: 404 },
    );
  }

  const existing = result.isbn
    ? await prisma.book.findUnique({
        where: { isbn: result.isbn },
        select: { id: true, title: true, ownedCount: true },
      })
    : null;

  return NextResponse.json({ result, existing });
}

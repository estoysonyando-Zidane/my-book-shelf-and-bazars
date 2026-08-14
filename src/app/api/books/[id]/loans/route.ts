import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type CreateLoanBody = {
  borrowerName: string;
  dueAt?: string | null;
};

// POST /api/books/:id/loans — 貸出登録
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = (await req.json()) as CreateLoanBody;

  if (!body.borrowerName?.trim()) {
    return NextResponse.json(
      { error: "貸出先の名前は必須です" },
      { status: 400 },
    );
  }

  const activeLoan = await prisma.loan.findFirst({
    where: { bookId: id, returnedAt: null },
  });
  if (activeLoan) {
    return NextResponse.json(
      { error: "この本は既に貸出中です" },
      { status: 409 },
    );
  }

  const loan = await prisma.loan.create({
    data: {
      bookId: id,
      borrowerName: body.borrowerName,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    },
  });

  return NextResponse.json({ loan }, { status: 201 });
}

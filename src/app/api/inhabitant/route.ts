import { NextResponse } from "next/server";
import { getOrAdvanceInhabitantState } from "@/lib/inhabitant";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const state = await getOrAdvanceInhabitantState();

  const book = state.currentBookId
    ? await prisma.book.findUnique({
        where: { id: state.currentBookId },
        select: { id: true, title: true, author: true },
      })
    : null;

  return NextResponse.json({
    activity: state.activity,
    location: state.location,
    book,
  });
}

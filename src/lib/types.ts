import type { Prisma } from "@/generated/prisma/client";

export type BookListItem = Prisma.BookGetPayload<{
  include: {
    tags: { include: { tag: true } };
    loans: true;
  };
}>;

export type BookDetail = Prisma.BookGetPayload<{
  include: {
    tags: { include: { tag: true } };
    loans: true;
    comments: true;
    reservations: true;
  };
}>;

export function isCurrentlyLentOut(book: { loans: { returnedAt: Date | null }[] }): boolean {
  return book.loans.some((loan) => loan.returnedAt === null);
}

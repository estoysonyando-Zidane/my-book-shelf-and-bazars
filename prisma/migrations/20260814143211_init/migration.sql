-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('UNREAD', 'READING', 'FINISHED');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "CommentAuthorType" AS ENUM ('OWNER', 'COLLEAGUE');

-- CreateEnum
CREATE TYPE "InhabitantActivity" AS ENUM ('IDLE', 'READING', 'NAPPING', 'CARRYING');

-- CreateEnum
CREATE TYPE "InhabitantLocation" AS ENUM ('SHELF', 'ROOM');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "publishedYear" INTEGER,
    "pageCount" INTEGER,
    "coverImageUrl" TEXT,
    "measuredWidthMm" DOUBLE PRECISION,
    "measuredHeightMm" DOUBLE PRECISION,
    "measuredDepthMm" DOUBLE PRECISION,
    "ownedCount" INTEGER NOT NULL DEFAULT 1,
    "readingStatus" "ReadingStatus" NOT NULL DEFAULT 'UNREAD',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookTag" (
    "bookId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "BookTag_pkey" PRIMARY KEY ("bookId","tagId")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "loanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorType" "CommentAuthorType" NOT NULL DEFAULT 'OWNER',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InhabitantState" (
    "id" TEXT NOT NULL,
    "activity" "InhabitantActivity" NOT NULL DEFAULT 'IDLE',
    "currentBookId" TEXT,
    "location" "InhabitantLocation" NOT NULL DEFAULT 'SHELF',
    "stateStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextTransitionAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InhabitantState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "reservedByName" TEXT NOT NULL,
    "reservedByColleagueId" TEXT,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colleague" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Colleague_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Loan_bookId_idx" ON "Loan"("bookId");

-- CreateIndex
CREATE INDEX "Comment_bookId_idx" ON "Comment"("bookId");

-- CreateIndex
CREATE INDEX "Reservation_bookId_idx" ON "Reservation"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Colleague_inviteToken_key" ON "Colleague"("inviteToken");

-- AddForeignKey
ALTER TABLE "BookTag" ADD CONSTRAINT "BookTag_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookTag" ADD CONSTRAINT "BookTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InhabitantState" ADD CONSTRAINT "InhabitantState_currentBookId_fkey" FOREIGN KEY ("currentBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_reservedByColleagueId_fkey" FOREIGN KEY ("reservedByColleagueId") REFERENCES "Colleague"("id") ON DELETE SET NULL ON UPDATE CASCADE;

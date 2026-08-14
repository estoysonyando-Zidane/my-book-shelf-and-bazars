import { BookSpine } from "@/components/BookSpine";
import { InhabitantMark, type InhabitantActivity } from "@/components/Inhabitant";
import type { BookListItem } from "@/lib/types";

const SHELF_HEIGHT = 240;
const BOARD_THICKNESS = 14;

export function BookShelf({
  books,
  inhabitant,
}: {
  books: BookListItem[];
  inhabitant?: { activity: InhabitantActivity; bookId: string | null };
}) {
  if (books.length === 0) {
    return (
      <p className="p-10 text-center text-muted">
        まだ本が登録されていません。「本を登録」から最初の1冊を追加してください。
      </p>
    );
  }

  const readingBookVisible =
    inhabitant?.activity === "READING" &&
    inhabitant.bookId != null &&
    books.some((b) => b.id === inhabitant.bookId);

  const showFloating =
    inhabitant && (inhabitant.activity === "IDLE" || inhabitant.activity === "NAPPING");

  return (
    <div
      className="relative flex flex-wrap items-end gap-x-1 gap-y-0 rounded-sm p-6"
      style={{
        backgroundColor: "var(--shelf-wood)",
        backgroundImage: `repeating-linear-gradient(to bottom,
          transparent 0px,
          transparent ${SHELF_HEIGHT - BOARD_THICKNESS}px,
          rgba(0,0,0,0.55) ${SHELF_HEIGHT - BOARD_THICKNESS}px,
          rgba(0,0,0,0.35) ${SHELF_HEIGHT}px)`,
        backgroundSize: `100% ${SHELF_HEIGHT}px`,
      }}
    >
      {books.map((book) => (
        <BookSpine
          key={book.id}
          book={book}
          inhabitantReadingHere={readingBookVisible && book.id === inhabitant?.bookId}
        />
      ))}
      {showFloating && (
        <span className="pointer-events-none absolute bottom-4 right-6">
          <InhabitantMark activity={inhabitant!.activity} />
        </span>
      )}
    </div>
  );
}

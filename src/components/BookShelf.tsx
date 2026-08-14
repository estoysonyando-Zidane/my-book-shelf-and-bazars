import { BookSpine } from "@/components/BookSpine";
import { InhabitantMark, type InhabitantActivity } from "@/components/Inhabitant";
import type { BookListItem } from "@/lib/types";

const SHELF_HEIGHT = 240;
const BOARD_THICKNESS = 14;

function floatingPosition(seed: string): { top: string; left: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);
  // 棚の中の適当な一角(端に寄りすぎない範囲)に、状態が変わるたびに違う場所へ
  const top = 20 + (hash % 60); // 20%〜80%
  const left = 8 + ((hash >> 8) % 84); // 8%〜92%
  return { top: `${top}%`, left: `${left}%` };
}

export function BookShelf({
  books,
  inhabitant,
  rediscoveredBookId,
}: {
  books: BookListItem[];
  inhabitant?: {
    activity: InhabitantActivity;
    bookId: string | null;
    stateStartedAt?: string;
    recentlyLeftBookId?: string | null;
  };
  rediscoveredBookId?: string | null;
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
    !!inhabitant &&
    (inhabitant.activity === "IDLE" || inhabitant.activity === "NAPPING");

  // 常に位置は計算し続け、表示/非表示はopacityで切り替える。
  // こうすることでDOMを維持したままtop/leftのtransitionが効き、
  // 次に現れる時も「今いた場所」から滑るように動けるようにする。
  const floatPos = inhabitant
    ? floatingPosition(`${inhabitant.activity}:${inhabitant.stateStartedAt ?? ""}`)
    : { top: "50%", left: "50%" };

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
      {books.map((book, i) => (
        <BookSpine
          key={book.id}
          book={book}
          index={i}
          inhabitantReadingHere={readingBookVisible && book.id === inhabitant?.bookId}
          recentlyVisitedByInhabitant={book.id === inhabitant?.recentlyLeftBookId}
          rediscovered={book.id === rediscoveredBookId}
        />
      ))}
      {inhabitant && (
        <span
          className="pointer-events-none absolute"
          style={{
            top: floatPos.top,
            left: floatPos.left,
            opacity: showFloating ? 1 : 0,
            transition: "top 3.5s ease, left 3.5s ease, opacity 1.4s ease",
          }}
        >
          <InhabitantMark activity={inhabitant.activity} />
        </span>
      )}
    </div>
  );
}

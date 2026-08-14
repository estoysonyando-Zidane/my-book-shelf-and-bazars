// 書誌情報の外部API連携(docs/requirements.md 3.1)
// openBD(国内書誌に強い)を優先し、ヒットしなければGoogle Booksを試す。

export type BookLookupResult = {
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  coverImageUrl: string | null;
  categories: string[];
  source: "openbd" | "google-books";
};

function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function parseYear(dateLike: string | undefined | null): number | null {
  if (!dateLike) return null;
  const match = dateLike.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

async function lookupOpenBD(isbn: string): Promise<BookLookupResult | null> {
  const res = await fetch(
    `https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn)}`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    summary?: {
      isbn?: string;
      title?: string;
      author?: string;
      publisher?: string;
      pubdate?: string;
      cover?: string;
    };
  } | null>;

  const summary = data?.[0]?.summary;
  if (!summary || !summary.title) return null;

  return {
    isbn: summary.isbn ?? isbn,
    title: summary.title,
    author: summary.author?.replace(/\s*\/.*$/, "") ?? null,
    publisher: summary.publisher ?? null,
    publishedYear: parseYear(summary.pubdate),
    pageCount: null,
    coverImageUrl: summary.cover || null,
    categories: [],
    source: "openbd",
  };
}

async function lookupGoogleBooks(
  query: string,
): Promise<BookLookupResult | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        pageCount?: number;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        industryIdentifiers?: Array<{ type: string; identifier: string }>;
        categories?: string[];
      };
    }>;
  };

  const item = data.items?.[0]?.volumeInfo;
  if (!item || !item.title) return null;

  const isbn13 = item.industryIdentifiers?.find(
    (id) => id.type === "ISBN_13",
  )?.identifier;
  const isbn10 = item.industryIdentifiers?.find(
    (id) => id.type === "ISBN_10",
  )?.identifier;

  return {
    isbn: isbn13 ?? isbn10 ?? null,
    title: item.title,
    author: item.authors?.join(", ") ?? null,
    publisher: item.publisher ?? null,
    publishedYear: parseYear(item.publishedDate),
    pageCount: item.pageCount ?? null,
    coverImageUrl:
      item.imageLinks?.thumbnail ?? item.imageLinks?.smallThumbnail ?? null,
    categories: item.categories ?? [],
    source: "google-books",
  };
}

/** ISBNから書誌情報を取得する。openBD→Google Booksの順にフォールバックする。 */
export async function lookupByIsbn(
  rawIsbn: string,
): Promise<BookLookupResult | null> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) return null;

  const fromOpenBD = await lookupOpenBD(isbn).catch(() => null);
  if (fromOpenBD) return fromOpenBD;

  return lookupGoogleBooks(`isbn:${isbn}`).catch(() => null);
}

/** 書名・著者名などのキーワードから書誌情報を検索する(Google Booksのみ対応)。 */
export async function searchByKeyword(
  query: string,
): Promise<BookLookupResult | null> {
  if (!query.trim()) return null;
  return lookupGoogleBooks(query).catch(() => null);
}

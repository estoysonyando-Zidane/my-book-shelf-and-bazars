// 背表紙のビジュアル生成(docs/design.md 1c)
// 本物のBlender等で焼き込んだ質感素材に差し替えられるまでの暫定実装として、
// CSS gradientで「光の当たり方」を疑似的に表現し、のっぺり感を避ける。

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type SpineVisual = {
  hue: number;
  widthPx: number;
  heightPx: number;
  dustLevel: number; // 0(真新しい)〜1(長く積読されている)
  tiltDeg: number; // 本ごとに固定の、ごくわずかな傾き
  depthLevel: number; // 0(手前)〜1(少し奥に押し込まれている)
  hasObi: boolean; // 帯(実物の紙のような、少し明るい横帯)が巻いているか
};

const BASE_HEIGHT = 200;
const MIN_WIDTH = 16;
const MAX_WIDTH = 64;
const MAX_DUST_DAYS = 365;

export function computeSpineVisual(book: {
  title: string;
  author?: string | null;
  pageCount?: number | null;
  measuredWidthMm?: number | null;
  measuredHeightMm?: number | null;
  acquiredAt?: string | Date;
  readingStatus?: string;
  tags?: { tag: { name: string; source: string } }[];
}): SpineVisual {
  const seed = `${book.title}${book.author ?? ""}`;
  const hash = hashString(seed);

  // ジャンルが色の塊として棚に浮かぶよう、タグがあればタグから色相を決め、
  // 本ごとのハッシュはその中でのわずかな揺らぎとしてだけ使う。
  // (タグが無ければこれまで通りタイトル/著者から色相を決める)
  const genreTag =
    book.tags?.find((t) => t.tag.source === "AUTO")?.tag.name ??
    book.tags?.[0]?.tag.name;
  const hue = genreTag
    ? (hashString(genreTag) + (hash % 30) - 15 + 360) % 360
    : hash % 360;

  // 色相とは別のビット位置を使い、色とは独立した「その本固有の個体差」を出す
  const tiltDeg = ((hash >> 6) % 50) / 10 - 2.5; // -2.5deg〜+2.5deg
  const depthLevel = ((hash >> 12) % 100) / 100 < 0.15 ? ((hash >> 18) % 60) / 100 : 0;
  const hasObi = (hash >> 20) % 6 === 0; // だいたい6冊に1冊

  let widthPx: number;
  if (book.measuredWidthMm) {
    widthPx = Math.round(book.measuredWidthMm * 0.9);
  } else if (book.pageCount) {
    widthPx = Math.round(book.pageCount / 15);
  } else {
    widthPx = 28;
  }
  widthPx = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, widthPx));

  const heightPx = book.measuredHeightMm
    ? Math.round(book.measuredHeightMm * 1.15)
    : BASE_HEIGHT;

  let dustLevel = 0;
  if (book.readingStatus === "UNREAD" && book.acquiredAt) {
    const days = (Date.now() - new Date(book.acquiredAt).getTime()) / 86_400_000;
    dustLevel = Math.max(0, Math.min(1, days / MAX_DUST_DAYS));
  }

  return { hue, widthPx, heightPx, dustLevel, tiltDeg, depthLevel, hasObi };
}

export function spineBackground(hue: number, dustLevel = 0, hasObi = false): string {
  // ベースカラー + ハイライト(左側)とシャドウ(右側)を重ねて、
  // 平面のままでも凹凸・質感があるように見せる。
  // 積読が長いほど彩度を落とし、埃をかぶったような薄い被膜を重ねる。
  const saturation = Math.round(32 - dustLevel * 18);
  const dustFilm = dustLevel * 0.35;

  const layers = [
    `radial-gradient(120% 60% at 50% 0%, rgba(200,195,185,${dustFilm}) 0%, transparent 65%)`,
    `linear-gradient(90deg,
      hsla(${hue},20%,90%,0.16) 0%,
      hsla(${hue},20%,90%,0.03) 12%,
      transparent 30%,
      transparent 70%,
      hsla(${hue},10%,0%,0.25) 92%,
      hsla(${hue},10%,0%,0.4) 100%)`,
  ];

  if (hasObi) {
    // 実物の紙の色を思わせる、少し明るい帯を下寄りに一本巻く
    layers.push(
      `linear-gradient(to bottom,
        transparent 62%,
        hsla(${hue},15%,88%,0.85) 64%,
        hsla(${hue},15%,88%,0.85) 76%,
        transparent 78%)`,
    );
  }

  layers.push(
    `linear-gradient(160deg, hsl(${hue} ${saturation}% 24%) 0%, hsl(${hue} ${Math.max(saturation - 6, 10)}% 15%) 100%)`,
  );

  return layers.join(", ");
}

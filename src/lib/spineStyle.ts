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
};

const BASE_HEIGHT = 200;
const MIN_WIDTH = 16;
const MAX_WIDTH = 64;

export function computeSpineVisual(book: {
  title: string;
  author?: string | null;
  pageCount?: number | null;
  measuredWidthMm?: number | null;
  measuredHeightMm?: number | null;
}): SpineVisual {
  const seed = `${book.title}${book.author ?? ""}`;
  const hue = hashString(seed) % 360;

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

  return { hue, widthPx, heightPx };
}

export function spineBackground(hue: number): string {
  // ベースカラー + ハイライト(左側)とシャドウ(右側)を重ねて、
  // 平面のままでも凹凸・質感があるように見せる
  return [
    `linear-gradient(90deg,
      hsla(${hue},20%,90%,0.16) 0%,
      hsla(${hue},20%,90%,0.03) 12%,
      transparent 30%,
      transparent 70%,
      hsla(${hue},10%,0%,0.25) 92%,
      hsla(${hue},10%,0%,0.4) 100%)`,
    `linear-gradient(160deg, hsl(${hue} 32% 24%) 0%, hsl(${hue} 26% 15%) 100%)`,
  ].join(", ");
}

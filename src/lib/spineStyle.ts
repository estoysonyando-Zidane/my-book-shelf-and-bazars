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

function stableRandom(seed: string, salt: string): number {
  return (hashString(seed + salt) % 10000) / 10000;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ジャンルが色の塊として棚に浮かぶための辞書。
// 自動タグ(書誌APIのカテゴリは英語のことが多い)と、
// 手動タグ(日本語が多い)の両方を拾えるようにしておく。
const GENRE_HUES: Record<string, number> = {
  文学: 12, 小説: 8, Fiction: 8, 詩: 320, Poetry: 320,
  評論: 260, 哲学: 268, Philosophy: 268, 歴史: 32, History: 32,
  自然科学: 190, 科学: 190, Science: 190, 数学: 205, Mathematics: 205,
  技術: 210, 技術書: 210, Technology: 210, Computers: 210,
  芸術: 340, 美術: 345, Art: 340, 写真: 220, Photography: 220,
  音楽: 288, Music: 288, 建築: 30, Architecture: 30,
  料理: 18, Cooking: 18, 旅: 165, Travel: 165, 地図: 150,
  図鑑: 100, Nature: 100, 児童書: 45, 絵本: 50, Juvenile: 45,
  コミック: 355, Comics: 355, 随筆: 25, エッセイ: 25,
  辞典: 240, Reference: 240, 伝記: 25, Biography: 25,
};

function lookupGenreHue(name: string): number | undefined {
  const exact = GENRE_HUES[name];
  if (exact !== undefined) return exact;
  const key = Object.keys(GENRE_HUES).find((k) => name.includes(k));
  return key ? GENRE_HUES[key] : undefined;
}

// 判型ごとの標準寸法(mm)。実測が無い本でも、判型が分かれば
// 「だいたいこのくらいの背丈」で並べられる。
type BookFormat = "bunko" | "shinsho" | "comic" | "tankobon" | "a5" | "b5" | "a4" | "oversize" | "unknown";

const FORMAT_HEIGHT_MM: Record<BookFormat, number> = {
  bunko: 148, shinsho: 173, comic: 174, tankobon: 188,
  a5: 210, b5: 257, a4: 297, oversize: 310, unknown: 188,
};
const FORMAT_WIDTH_MM: Record<Exclude<BookFormat, "unknown">, number> = {
  bunko: 105, shinsho: 105, comic: 112, tankobon: 128,
  a5: 148, b5: 182, a4: 210, oversize: 230,
};

// 「実測 幅(mm)」が分かるなら、判型を逆算したほうが文字列判定より確か。
function guessFormatFromWidth(widthMm: number): BookFormat {
  let best: BookFormat = "unknown";
  let bestDiff = Infinity;
  for (const [fmt, w] of Object.entries(FORMAT_WIDTH_MM)) {
    const diff = Math.abs(widthMm - w);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = fmt as BookFormat;
    }
  }
  return bestDiff <= 10 ? best : "unknown";
}

// 1ページあたりの紙厚(mm)と表紙まわりの厚み(mm)。判型で使う用紙が違う。
const PAGE_THICKNESS_MM: Record<BookFormat, number> = {
  bunko: 0.04, shinsho: 0.045, comic: 0.045, tankobon: 0.06,
  a5: 0.065, b5: 0.07, a4: 0.075, oversize: 0.08, unknown: 0.055,
};
const COVER_THICKNESS_MM: Record<BookFormat, number> = {
  bunko: 1.6, shinsho: 1.8, comic: 1.6, tankobon: 4.0,
  a5: 3.4, b5: 2.6, a4: 2.4, oversize: 4.5, unknown: 3.0,
};
// ページ数も分からないときの既定の厚み(mm)。
const DEFAULT_THICKNESS_MM: Record<BookFormat, number> = {
  bunko: 14, shinsho: 15, comic: 12, tankobon: 22,
  a5: 20, b5: 12, a4: 10, oversize: 25, unknown: 20,
};

// タイトル・出版社・タグから判型を当て推量する。当たらなくても
// unknown(四六判相当)として扱うので、事実を汚すことはない。
function guessFormat(hay: string): BookFormat {
  if (/文庫/.test(hay)) return "bunko";
  if (/新書/.test(hay)) return "shinsho";
  if (/コミック|COMIC|まんが|漫画/i.test(hay)) return "comic";
  if (/(画集|写真集|図鑑|絵本)/.test(hay)) return "oversize";
  if (/(ムック|MOOK|雑誌)/i.test(hay)) return "b5";
  return "unknown";
}

export type SpineVisual = {
  hue: number;
  saturation: number;
  lightness: number;
  cloth: boolean; // 布装丁っぽい(くすんだ)見た目か、紙装丁っぽい見た目か
  ink: string; // 題名の文字色(地の明るさに応じて読める側を選ぶ)
  foil: boolean; // 箔押しに見える文字色か
  widthPx: number;
  heightPx: number;
  dustLevel: number; // 0(真新しい)〜1(長く積読されている)
  tiltDeg: number; // 本ごとに固定の、ごくわずかな傾き
  depthLevel: number; // 0(手前)〜1(少し奥に押し込まれている)
  hasObi: boolean; // 帯(実物の紙のような、少し明るい横帯)が巻いているか
  hardcover: boolean; // 上製本らしい大きさなら、花ぎれを入れる
};

// mm→px の縮尺。高さ・厚みの両方に同じ値を使うことで、
// 実測でも判型からの推定でも、本ごとの相対的な大きさが崩れないようにする。
const PX_PER_MM = 1.15;
const MIN_WIDTH = 10;
const MAX_WIDTH = 64;
const MAX_DUST_DAYS = 365;

export function computeSpineVisual(book: {
  id?: string;
  title: string;
  author?: string | null;
  publisher?: string | null;
  pageCount?: number | null;
  measuredWidthMm?: number | null;
  measuredHeightMm?: number | null;
  measuredDepthMm?: number | null;
  acquiredAt?: string | Date;
  readingStatus?: string;
  tags?: { tag: { name: string; source: string } }[];
}): SpineVisual {
  const seed = book.id ?? `${book.title}${book.author ?? ""}`;
  const hash = hashString(seed);
  const tagNames = book.tags?.map((t) => t.tag.name) ?? [];

  // ジャンル(タグ)があればそこから色相を取り、無ければ出版社、
  // それも無ければタイトル/著者から決める。同じ分類でも本ごとに
  // 色みは散らし、棚の上で「塊だが揃ってはいない」見た目にする。
  const genreTag = tagNames.map(lookupGenreHue).find((h) => h !== undefined);
  const baseHue = genreTag ?? hashString(book.publisher || `${book.title}${book.author ?? ""}`) % 360;
  const jitter = (stableRandom(seed, "hue") - 0.5) * 70;
  const hue = (baseHue + jitter + 360) % 360;

  // 判型は「実測 幅(mm)」があればそこから逆算し、無ければ
  // タイトル・出版社・タグの文字列から当て推量する。
  const format = book.measuredWidthMm
    ? guessFormatFromWidth(book.measuredWidthMm)
    : guessFormat([book.title, book.publisher, ...tagNames].filter(Boolean).join(" "));

  // 背表紙の縦の長さ(=本の高さ)。実測が無ければ判型の標準寸法を使う。
  const heightMm = book.measuredHeightMm || FORMAT_HEIGHT_MM[format];
  const heightPx = Math.round(heightMm * PX_PER_MM);

  // 背表紙の横の太さ(=本の厚み)。「実測 幅」ではなく「実測 厚み」で決める。
  let thicknessMm: number;
  if (book.measuredDepthMm) {
    thicknessMm = book.measuredDepthMm;
  } else if (book.pageCount) {
    thicknessMm = book.pageCount * PAGE_THICKNESS_MM[format] + COVER_THICKNESS_MM[format];
  } else {
    thicknessMm = DEFAULT_THICKNESS_MM[format];
  }
  const widthPx = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(thicknessMm * PX_PER_MM)));

  // 布装丁(くすんだ)か紙装丁(少し鮮やか)か。実際の棚は彩度の高い本ばかりではない。
  const cloth = stableRandom(seed, "cloth") < 0.46;
  const thicknessBias = Math.min(1, widthPx / MAX_WIDTH); // 厚い本ほど彩度・明度が落ちる
  const satR = stableRandom(seed, "sat");
  const lumR = stableRandom(seed, "lum");
  const saturation = cloth
    ? lerp(8, 22, satR)
    : lerp(18, 46, satR) * (1 - thicknessBias * 0.3);
  const lightness = cloth
    ? lerp(20, 40, lumR) - thicknessBias * 6
    : lerp(24, 46, lumR) - thicknessBias * 8;

  const ink = lightness > 46 ? `hsl(${hue.toFixed(0)} 30% 16% / 0.86)` : `hsl(${hue.toFixed(0)} 20% 94% / 0.9)`;
  const foil = stableRandom(seed, "foil") < 0.3;

  const tiltDeg = ((hash >> 6) % 50) / 10 - 2.5; // -2.5deg〜+2.5deg
  const depthLevel = ((hash >> 12) % 100) / 100 < 0.15 ? ((hash >> 18) % 60) / 100 : 0;
  // 帯は画集・写真集のような大型本にはあまり付かない
  const hasObi = stableRandom(seed, "obi") < 0.16 && format !== "oversize";
  // 上製本(花ぎれ)は判型による。文庫・新書・コミックはまず上製にならない。
  const hardcoverRate: Partial<Record<BookFormat, number>> = {
    tankobon: 0.35, a5: 0.55, b5: 0.6, a4: 0.65, oversize: 0.75, unknown: 0.3,
  };
  const hardcover = stableRandom(seed, "hardcover") < (hardcoverRate[format] ?? 0);

  let dustLevel = 0;
  if (book.readingStatus === "UNREAD" && book.acquiredAt) {
    const days = (Date.now() - new Date(book.acquiredAt).getTime()) / 86_400_000;
    dustLevel = Math.max(0, Math.min(1, days / MAX_DUST_DAYS));
  }

  return {
    hue,
    saturation,
    lightness,
    cloth,
    ink,
    foil,
    widthPx,
    heightPx,
    dustLevel,
    tiltDeg,
    depthLevel,
    hasObi,
    hardcover,
  };
}

export function spineBackground(v: SpineVisual): string {
  // 積読が長いほど彩度を落とし、埃をかぶったような薄い被膜を重ねる。
  const s = Math.max(4, v.saturation - v.dustLevel * 14);
  const l = v.lightness;
  const dustFilm = v.dustLevel * 0.35;
  const hue = v.hue.toFixed(0);

  const layers = [
    `radial-gradient(120% 60% at 50% 0%, rgba(200,195,185,${dustFilm}) 0%, transparent 65%)`,
    // 天(上の小口): 紙の色がわずかに見える薄い帯
    `linear-gradient(to bottom, hsla(42,24%,80%,0.5) 0%, hsla(42,24%,80%,0.5) 1.4%, transparent 1.4%)`,
    // 足元の影: 棚板に接する部分をわずかに沈める
    `linear-gradient(to top, hsla(0,0%,0%,0.32) 0%, hsla(0,0%,0%,0.32) 1.2%, transparent 1.2%)`,
  ];

  if (v.hasObi) {
    // 実物の紙の色を思わせる、地色とは少しずれた色みの帯を下寄りに一本巻く
    const obiHue = (v.hue + 30) % 360;
    layers.push(
      `linear-gradient(to bottom,
        transparent 73%,
        hsla(${obiHue.toFixed(0)},16%,80%,0.9) 74%,
        hsla(${obiHue.toFixed(0)},16%,80%,0.9) 91%,
        transparent 92%)`,
    );
  }

  if (v.hardcover) {
    // 上製本の花ぎれ(背の上下の帯)
    layers.push(
      `linear-gradient(to bottom,
        hsla(${hue},20%,8%,0.5) 5.5%, hsla(${hue},20%,8%,0.5) 6.7%, transparent 6.7%,
        transparent 94.3%, hsla(${hue},20%,8%,0.5) 94.3%, hsla(${hue},20%,8%,0.5) 95.5%)`,
    );
  }

  // 背の丸みを、横方向の4段グラデーションで表す(単純な2段より本物らしい)
  layers.push(
    `linear-gradient(90deg,
      hsl(${hue} ${s}% ${Math.max(l - 13, 4)}%) 0%,
      hsl(${hue} ${s}% ${Math.min(l + 3, 92)}%) 18%,
      hsl(${hue} ${s}% ${Math.min(l + 6, 92)}%) 55%,
      hsl(${hue} ${s}% ${Math.max(l - 16, 4)}%) 100%)`,
  );

  return layers.join(", ");
}

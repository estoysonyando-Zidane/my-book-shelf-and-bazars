// 蔵書空間の時間の流れを示す、雰囲気だけのフッター表示。
// 実際の天候APIは使わず(嘘の天気を出したくないので)、季節と時間帯のみを実時刻から算出する。

export function currentSeason(date = new Date()): string {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "春";
  if (month >= 6 && month <= 8) return "夏";
  if (month >= 9 && month <= 11) return "秋";
  return "冬";
}

export function currentTimeOfDay(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return "朝";
  if (hour >= 9 && hour < 17) return "昼";
  if (hour >= 17 && hour < 19) return "夕方";
  if (hour >= 19 && hour < 23) return "夜";
  return "夜更け";
}

export function ambienceLabel(date = new Date()): string {
  return `${currentSeason(date)}・${currentTimeOfDay(date)}`;
}

// 住人にも同じ時間が流れていることを、色温度のわずかな変化で示す。
// あくまで気配レベルの演出なので、はっきり気づかれない程度にとどめる。
const TIME_TINT: Record<string, string> = {
  朝: "brightness(1.05) saturate(1.05) hue-rotate(-4deg)",
  昼: "none",
  夕方: "brightness(1.08) saturate(1.15) hue-rotate(-8deg)",
  夜: "brightness(0.85) saturate(0.85)",
  夜更け: "brightness(0.7) saturate(0.6) hue-rotate(6deg)",
};

export function timeOfDayTint(date = new Date()): string {
  return TIME_TINT[currentTimeOfDay(date)] ?? "none";
}

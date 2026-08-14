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

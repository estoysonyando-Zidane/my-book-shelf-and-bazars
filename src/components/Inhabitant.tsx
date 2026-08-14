"use client";

// 蔵書空間に住む、正体不明の存在(docs/requirements.md 3.6)。
// 名前を持たない「気配」であることが核なので、具体的なキャラクター造形はせず、
// 複数の発光レイヤーを重ねた曖昧な「ゆらぎ」として表現する。

export type InhabitantActivity = "IDLE" | "READING" | "NAPPING" | "CARRYING";

const ACTIVITY_COLOR: Record<InhabitantActivity, { core: string; halo: string }> = {
  IDLE: { core: "rgba(217,164,65,0.85)", halo: "rgba(125,106,168,0.5)" },
  READING: { core: "rgba(230,190,110,0.95)", halo: "rgba(217,164,65,0.55)" },
  NAPPING: { core: "rgba(140,150,200,0.65)", halo: "rgba(90,80,130,0.4)" },
  CARRYING: { core: "transparent", halo: "transparent" },
};

const ANIMATION: Record<InhabitantActivity, string> = {
  IDLE: "animate-[inhabitant-drift_8s_ease-in-out_infinite]",
  READING: "animate-[inhabitant-glow_4s_ease-in-out_infinite]",
  NAPPING: "animate-[inhabitant-breathe_10s_ease-in-out_infinite]",
  CARRYING: "",
};

export function InhabitantMark({
  activity,
  size = 18,
}: {
  activity: InhabitantActivity;
  size?: number;
}) {
  const { core, halo } = ACTIVITY_COLOR[activity];

  return (
    <span
      aria-hidden
      className="pointer-events-none relative block"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-[-60%] rounded-full animate-[inhabitant-flicker_6s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle, ${halo} 0%, transparent 70%)`,
          filter: "blur(3px)",
        }}
      />
      <span
        className={`absolute inset-0 rounded-full ${ANIMATION[activity]}`}
        style={{
          background: `radial-gradient(circle, ${core} 0%, ${halo} 55%, transparent 80%)`,
          filter: "blur(1px)",
        }}
      />
    </span>
  );
}

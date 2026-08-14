"use client";

// 蔵書空間に住む、正体不明の存在(docs/requirements.md 3.6)。
// 名前を持たない「気配」であることが核なので、具体的なキャラクター造形はせず、
// ぼんやりと発光する曖昧な存在として表現する。

export type InhabitantActivity = "IDLE" | "READING" | "NAPPING" | "CARRYING";

const ANIMATION: Record<InhabitantActivity, string> = {
  IDLE: "animate-[inhabitant-drift_7s_ease-in-out_infinite]",
  READING: "animate-[inhabitant-glow_4s_ease-in-out_infinite]",
  NAPPING: "animate-[inhabitant-breathe_9s_ease-in-out_infinite]",
  CARRYING: "",
};

export function InhabitantMark({ activity }: { activity: InhabitantActivity }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none block h-4 w-4 rounded-full ${ANIMATION[activity]}`}
      style={{
        background:
          "radial-gradient(circle, rgba(217,164,65,0.9) 0%, rgba(125,106,168,0.55) 55%, transparent 80%)",
        filter: "blur(1.5px)",
      }}
    />
  );
}

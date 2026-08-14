"use client";

// 蔵書空間に住む、正体不明の存在(docs/requirements.md 3.6)。
// クラバウターマンのような「フードを被った小さな影」を起源イメージとし、
// 顔や細部は描かず輪郭(シルエット)だけを見せることで、正体不明さを保ったまま
// 何をしているか(佇む/読む/眠る)が姿勢で伝わるようにする。

export type InhabitantActivity = "IDLE" | "READING" | "NAPPING" | "CARRYING";

const ACTIVITY_GLOW: Record<InhabitantActivity, string> = {
  IDLE: "rgba(125,106,168,0.85)",
  READING: "rgba(217,164,65,0.9)",
  NAPPING: "rgba(90,100,150,0.6)",
  CARRYING: "transparent",
};

const ANIMATION: Record<InhabitantActivity, string> = {
  IDLE: "animate-[inhabitant-sway_6s_ease-in-out_infinite]",
  READING: "animate-[inhabitant-nod_5s_ease-in-out_infinite]",
  NAPPING: "animate-[inhabitant-breathe_9s_ease-in-out_infinite]",
  CARRYING: "",
};

// フードを被った小さな影のシルエット(顔・手足は描かない)
const SILHOUETTE_PATH =
  "M12 1.5C8.5 1.5 6 5 6 9.5C6 13 7 14.5 6.2 16.5C4.8 19.5 4.5 24.5 7 27C9 29 15 29 17 27C19.5 24.5 19.2 19.5 17.8 16.5C17 14.5 18 13 18 9.5C18 5 15.5 1.5 12 1.5Z";

const POSE_TRANSFORM: Record<InhabitantActivity, string> = {
  IDLE: "rotate(0deg)",
  READING: "rotate(24deg) translateY(3px)",
  NAPPING: "rotate(90deg) scaleY(0.72) translateY(2px)",
  CARRYING: "rotate(0deg)",
};

export function InhabitantMark({
  activity,
  size = 26,
}: {
  activity: InhabitantActivity;
  size?: number;
}) {
  const glow = ACTIVITY_GLOW[activity];

  return (
    <span
      aria-hidden
      className="pointer-events-none block transition-transform duration-[1400ms] ease-[cubic-bezier(0.34,0.2,0.2,1)]"
      style={{
        width: size,
        height: size,
        transform: POSE_TRANSFORM[activity],
        transformOrigin: "50% 85%",
      }}
    >
      <span className={`block ${ANIMATION[activity]}`} style={{ transformOrigin: "50% 85%" }}>
        <svg
          viewBox="0 0 24 32"
          width={size}
          height={size}
          style={{
            filter: `drop-shadow(0 0 3px ${glow}) drop-shadow(0 0 7px ${glow})`,
          }}
        >
          <path
            d={SILHOUETTE_PATH}
            fill="rgba(18,14,26,0.92)"
            stroke={glow}
            strokeWidth="0.6"
          />
        </svg>
      </span>
    </span>
  );
}

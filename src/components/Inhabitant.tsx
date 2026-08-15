"use client";

import { useEffect, useRef, useState } from "react";
import { timeOfDayTint } from "@/lib/ambience";

// 蔵書空間に住む、正体不明の存在(docs/requirements.md 3.6)。
// クラバウターマン的な方向性の抽象化: 特定のキャラクター・動物の直接引用はしない。
// 丸っこい毛玉や人型そのものではなく、「布に包まれた輪郭の下に手足だけが覗く」姿にし、
// 顔があるはずの場所はあえて陰にして、微かな光点二つだけを覗かせる。
// 配色は古い革装丁・すり切れた紙を思わせる暖色でまとめる(冷たい色は使わない)。

export type InhabitantActivity = "IDLE" | "READING" | "NAPPING" | "CARRYING";

const CLOAK_MAIN = "#7a5c42";
const CLOAK_SHADE = "#50392a";
const CLOAK_TRIM = "#b08a4a";
const GLIMPSE_COLOR = "#e0c9a0";
const LIMB_COLOR = "#5c4530";
const FACE_SHADOW = "#1c1712";

const ACTIVITY_GLOW: Record<InhabitantActivity, string> = {
  IDLE: "rgba(176,138,74,0.35)",
  READING: "rgba(224,201,160,0.4)",
  NAPPING: "rgba(122,92,66,0.3)",
  CARRYING: "transparent",
};

const ANIMATION: Record<InhabitantActivity, string> = {
  IDLE: "animate-[inhabitant-sway_6s_ease-in-out_infinite]",
  READING: "animate-[inhabitant-nod_5s_ease-in-out_infinite]",
  NAPPING: "animate-[inhabitant-breathe_9s_ease-in-out_infinite]",
  CARRYING: "",
};

// タップした時だけ覗ける、声にならない声。常設のステータス表示はしない
const PEEK_WORDS: Record<InhabitantActivity, string[]> = {
  IDLE: ["……", "じー"],
  READING: ["……", "ふむ"],
  NAPPING: ["スヤ…", "ん〜"],
  CARRYING: [],
};

const GESTURE_ANIMATION: Record<"stretch" | "stumble", string> = {
  stretch: "animate-[inhabitant-stretch_0.7s_ease-in-out_1]",
  stumble: "animate-[inhabitant-stumble_0.7s_ease-in-out_1]",
};
const GESTURE_WORD: Record<"stretch" | "stumble", string> = {
  stretch: "ん〜",
  stumble: "よろっ",
};

// 布の裾は左右非対称に(量産マスコットっぽい左右対称を避ける)
const BODY_PATH = "M2,44 Q-2,24 11,10 Q21,2 32,9 Q46,22 43,42 Q32,38 25,44 Q15,39 2,44 Z";
const BODY_SHADE_PATH = "M2,44 Q-2,24 11,10 Q7,26 9,44 Z";
const EAR_L_PATH = "M14,11 L8,0 L19,8 Z";
const EAR_R_PATH = "M30,10 L36,3 L26,7 Z";

const POSE_TRANSFORM: Record<InhabitantActivity, string> = {
  IDLE: "rotate(0deg)",
  READING: "rotate(16deg) translateY(1px)",
  NAPPING: "rotate(90deg) scaleY(0.82)",
  CARRYING: "rotate(0deg)",
};

const SPARKLE_POINTS: [number, number, number][] = [
  [11, 12, 0], // x, y, animation-delay(s)
  [35, 15, 0.6],
  [33, 27, 1.2],
];

function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <path
      d={`M${x} ${y - 2}L${x + 0.6} ${y - 0.6}L${x + 2} ${y}L${x + 0.6} ${y + 0.6}L${x} ${y + 2}L${x - 0.6} ${y + 0.6}L${x - 2} ${y}L${x - 0.6} ${y - 0.6}Z`}
      fill={GLIMPSE_COLOR}
      style={{
        animation: `sparkle-twinkle 2.4s ease-in-out ${delay}s infinite`,
        transformOrigin: `${x}px ${y}px`,
      }}
    />
  );
}

// 長く積読されていた本を読んでいる時だけ、単なる読書ではない
// 「忘れられた本を掘り起こした」特別な瞬間として、きらめきを添える
function HeldBook({ hue, dustLevel = 0 }: { hue: number; dustLevel?: number }) {
  const cover = `hsl(${hue} 35% 30%)`;
  const isRediscovery = dustLevel > 0.3;
  return (
    <g>
      <rect x="14" y="16" width="18" height="12" rx="0.6" fill={cover} stroke={FACE_SHADOW} strokeWidth="0.6" />
      <rect x="16.5" y="18" width="13" height="8" fill={GLIMPSE_COLOR} opacity="0.9" />
      <line x1="23" y1="18" x2="23" y2="26" stroke={FACE_SHADOW} strokeWidth="0.4" />
      {isRediscovery &&
        SPARKLE_POINTS.map(([x, y, delay]) => <Sparkle key={x} x={x} y={y} delay={delay} />)}
    </g>
  );
}

function Face({ activity }: { activity: InhabitantActivity }) {
  // 顔があるはずの場所はあえて陰にし、正体は明かさない。
  // 目は「本当に目なのかも定かでない」微かな光点二つだけ
  return (
    <>
      <ellipse cx="21" cy="14" rx="8" ry="7" fill={FACE_SHADOW} opacity="0.55" />
      {activity === "NAPPING" ? (
        <>
          <line x1="17.5" y1="14" x2="20.5" y2="14" stroke={GLIMPSE_COLOR} strokeWidth="0.7" opacity="0.6" />
          <line x1="23.5" y1="14.5" x2="26.5" y2="14.5" stroke={GLIMPSE_COLOR} strokeWidth="0.7" opacity="0.6" />
        </>
      ) : (
        <>
          <circle cx="19" cy="14" r="1.3" fill={GLIMPSE_COLOR} opacity="0.85" />
          <circle cx="25.5" cy="14.5" r="1.3" fill={GLIMPSE_COLOR} opacity="0.85" />
        </>
      )}
    </>
  );
}

export function InhabitantMark({
  activity,
  size = 34,
  heldBookHue,
  heldBookDustLevel,
}: {
  activity: InhabitantActivity;
  size?: number;
  heldBookHue?: number;
  heldBookDustLevel?: number;
}) {
  const glow = ACTIVITY_GLOW[activity];
  const [bubble, setBubble] = useState<string | null>(null);
  const [gesture, setGesture] = useState<"" | "stretch" | "stumble">("");
  const bubbleTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [tint, setTint] = useState("none");

  // 住人にも同じ時間が流れていることを、色温度でうっすら示す
  useEffect(() => {
    const update = () => setTint(timeOfDayTint());
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  function showBubble(word: string) {
    setBubble(word);
    clearTimeout(bubbleTimeout.current);
    bubbleTimeout.current = setTimeout(() => setBubble(null), 1800);
  }

  function handleClick() {
    const words = PEEK_WORDS[activity];
    if (words.length === 0) return;
    showBubble(words[Math.floor(Math.random() * words.length)]);
  }

  // ごく低頻度で、伸びをしたりつまずいたりする一回性の仕草を混ぜる(完璧じゃない感じ)
  useEffect(() => {
    if (activity !== "IDLE" && activity !== "READING") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = 18_000 + Math.random() * 22_000;
      timer = setTimeout(() => {
        if (cancelled) return;
        const kind: "stretch" | "stumble" = Math.random() < 0.5 ? "stretch" : "stumble";
        setGesture(kind);
        showBubble(GESTURE_WORD[kind]);
        setTimeout(() => {
          if (!cancelled) setGesture("");
        }, 700);
        schedule();
      }, delay);
    };
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activity]);

  const swayClass = gesture ? GESTURE_ANIMATION[gesture] : ANIMATION[activity];

  return (
    <span
      className="relative block cursor-pointer"
      style={{ width: size, height: size }}
      onClick={handleClick}
    >
      {bubble && (
        // 姿勢の回転を引き継がないよう、回転する要素の外側に置く
        <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-background-elevated/95 px-1.5 py-0.5 text-[9px] text-foreground/90 shadow [animation:peek-bubble_1.8s_ease-out_forwards]">
          {bubble}
        </span>
      )}
      <span
        className="block transition-transform duration-[1400ms] ease-[cubic-bezier(0.34,0.2,0.2,1)]"
        style={{
          width: size,
          height: size,
          transform: POSE_TRANSFORM[activity],
          transformOrigin: "50% 90%",
        }}
      >
        <span className={`block ${swayClass}`} style={{ transformOrigin: "50% 90%" }}>
          <svg
            viewBox="0 0 46 46"
            width={size}
            height={size}
            style={{ filter: `drop-shadow(0 0 5px ${glow}) ${tint}` }}
          >
            {/* 布の裾から覗く、丸い足 */}
            <ellipse cx="16" cy="39" rx="4.2" ry="5.5" fill={CLOAK_SHADE} />
            <ellipse cx="30" cy="39" rx="4.2" ry="5.5" fill={CLOAK_SHADE} />
            {/* 布から覗く、ずんぐりした短い腕 */}
            <ellipse cx="7" cy="22" rx="3.4" ry="7.5" fill={LIMB_COLOR} />
            <ellipse cx="39" cy="22" rx="3.4" ry="7.5" fill={LIMB_COLOR} />
            {/* 本体: ぼろ布に包まれた、裾広がりのドーム型シルエット */}
            <path d={BODY_PATH} fill={CLOAK_MAIN} />
            <path d={BODY_SHADE_PATH} fill={CLOAK_SHADE} opacity="0.4" />
            {/* 頭巾の房: 左右非対称・不揃いな2つの突起(擦り切れた布の角) */}
            <path d={EAR_L_PATH} fill={CLOAK_TRIM} />
            <path d={EAR_R_PATH} fill={CLOAK_TRIM} />
            <Face activity={activity} />
            {/* 布の合わせ目からわずかに覗く何か(正体は明かさない、色の存在感だけ) */}
            <ellipse cx="24" cy="32" rx="2.2" ry="5.5" fill={GLIMPSE_COLOR} opacity="0.55" />
            {/* 読んでいる本(実物の背表紙と同じ色味の表紙にして、本当にその本だと分かるようにする) */}
            {activity === "READING" && (
              <HeldBook hue={heldBookHue ?? 40} dustLevel={heldBookDustLevel} />
            )}
          </svg>
        </span>
      </span>
    </span>
  );
}

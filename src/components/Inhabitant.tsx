"use client";

import { useEffect, useRef, useState } from "react";

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
  const [bubble, setBubble] = useState<string | null>(null);
  const [gesture, setGesture] = useState<"" | "stretch" | "stumble">("");
  const bubbleTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
          transformOrigin: "50% 85%",
        }}
      >
        <span className={`block ${swayClass}`} style={{ transformOrigin: "50% 85%" }}>
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
    </span>
  );
}

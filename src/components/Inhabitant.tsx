"use client";

import { useEffect, useRef, useState } from "react";

// 蔵書空間に住む、正体不明の存在(docs/requirements.md 3.6)。
// 「見えない曖昧さ」ではなく「見えているのに種族が分からない」に方針転換。
// 顔(目)・耳らしきもの・手足・体をちゃんと持った生き物として描き、
// その上で何の生き物とも言えない体つきにすることで、愛着と未知を両立させる。

export type InhabitantActivity = "IDLE" | "READING" | "NAPPING" | "CARRYING";

const ACTIVITY_GLOW: Record<InhabitantActivity, string> = {
  IDLE: "#c9b8ec",
  READING: "#f0c878",
  NAPPING: "#8f9fd6",
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

const BODY_COLOR = "#221c30";
const BODY_STROKE = "#3a3050";

// 丸みを帯びた体(種族不明)。耳らしき突起と手足だけ添える
const BODY_PATH =
  "M15 4C9 4 5.5 9 5.5 15C5.5 19.5 7 21.5 6.5 24.5C6 28 9 31 15 31C21 31 24 28 23.5 24.5C23 21.5 24.5 19.5 24.5 15C24.5 9 21 4 15 4Z";

const POSE_TRANSFORM: Record<InhabitantActivity, string> = {
  IDLE: "rotate(0deg)",
  READING: "rotate(18deg) translateY(2px)",
  NAPPING: "rotate(90deg) scaleY(0.8) translateY(1px)",
  CARRYING: "rotate(0deg)",
};

function Eyes({ activity, glow }: { activity: InhabitantActivity; glow: string }) {
  if (activity === "NAPPING") {
    return (
      <>
        <rect x="9.3" y="14" width="3.4" height="1" rx="0.5" fill={BODY_STROKE} />
        <rect x="17.3" y="14" width="3.4" height="1" rx="0.5" fill={BODY_STROKE} />
      </>
    );
  }
  const ry = activity === "READING" ? 1.1 : 1.8;
  return (
    <>
      <ellipse cx="11" cy="14.5" rx="1.8" ry={ry} fill={glow} />
      <ellipse cx="19" cy="14.5" rx="1.8" ry={ry} fill={glow} />
    </>
  );
}

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
          transformOrigin: "50% 88%",
        }}
      >
        <span className={`block ${swayClass}`} style={{ transformOrigin: "50% 88%" }}>
          <svg viewBox="0 0 30 34" width={size} height={size}>
            {/* 足 */}
            <ellipse cx="11" cy="30.5" rx="2.6" ry="2" fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth="0.5" />
            <ellipse cx="19" cy="30.5" rx="2.6" ry="2" fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth="0.5" />
            {/* 腕 */}
            <ellipse cx="4.3" cy="18" rx="2.3" ry="3.4" fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth="0.5" />
            <ellipse cx="25.7" cy="18" rx="2.3" ry="3.4" fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth="0.5" />
            {/* 耳らしきもの(何の耳かは分からない) */}
            <circle cx="9" cy="3.2" r="2.1" fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth="0.5" />
            <circle cx="21" cy="3.2" r="2.1" fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth="0.5" />
            {/* 体 */}
            <path d={BODY_PATH} fill={BODY_COLOR} stroke={BODY_STROKE} strokeWidth="0.6" />
            <Eyes activity={activity} glow={glow} />
          </svg>
        </span>
      </span>
    </span>
  );
}

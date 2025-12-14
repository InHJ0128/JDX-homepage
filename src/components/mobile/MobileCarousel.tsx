import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

type Highlight = {
  id: number;
  target_type: "activity" | "work";
  target_id: number;
  title_ko: string;
  title_ja: string;
  image_url?: string;
};

const ROTATE_MS = 5000;

export default function MobileCarousel() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<Highlight[]>([]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  // 데이터 로드: 데스크톱과 동일하게 홈 하이라이트 사용
  useEffect(() => {
    fetch("/api/user/home-highlights")
      .then(res => res.json())
      .then((arr: Highlight[]) => {
        const withImg = arr.filter(a => a.image_url);
        setItems(withImg);
        setIdx(0);
      })
      .catch(err => console.error("홈 하이라이트 불러오기 실패:", err));
  }, []);

  // 자동 회전
  useEffect(() => {
    if (items.length <= 1) return;
    stop();
    timerRef.current = window.setInterval(() => {
      setIdx(i => (i + 1) % items.length);
    }, ROTATE_MS);
    return stop;
  }, [items.length]);

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const go = (n: number) => {
    if (!items.length) return;
    setIdx((n + items.length) % items.length);
  };

  // 스와이프
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    stop();
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = touch.current;
    if (!t) return;
    const { clientX, clientY } = e.changedTouches[0];
    const dx = clientX - t.x, dy = clientY - t.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      go(idx + (dx < 0 ? 1 : -1));
    }
    touch.current = null;
  };

  const current = items[idx];
  const title = current ? (language === "ko" ? current.title_ko : current.title_ja) : "";
  const clickThrough = () => {
    if (!current) return;
    // ✅ 모바일 상세 경로로 이동
    navigate(
      current.target_type === "activity"
        ? `/m/activities/${current.target_id}`
        : `/m/works/${current.target_id}`
    );
  };

  const hasMultiple = items.length > 1;

  return (
    <section aria-label="모바일 캐러셀" style={{ margin: "8px 0 16px" }}>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 14,
          overflow: "hidden",
          background: "#111",
        }}
      >
        {current ? (
          <img
            key={current.id}
            src={current.image_url}
            alt={title}
            onClick={clickThrough}
            loading="eager"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              cursor: "pointer",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#aaa",
              fontSize: 13,
            }}
          >
            이미지 불러오는 중…
          </div>
        )}

        {/* ◀ 이전 / 다음 ▶ */}
        {hasMultiple && (
          <>
            <button
              aria-label="이전"
              onClick={() => go(idx - 1)}
              style={navBtnStyle("left")}
            >
              ‹
            </button>
            <button
              aria-label="다음"
              onClick={() => go(idx + 1)}
              style={navBtnStyle("right")}
            >
              ›
            </button>
          </>
        )}

        {/* 하단 인디케이터 */}
        {hasMultiple && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 8,
              display: "flex",
              gap: 6,
              justifyContent: "center",
            }}
          >
            {items.map((_, i) => (
              <i
                key={i}
                onClick={() => go(i)}
                aria-label={`${i + 1}번 이미지`}
                style={{
                  width: i === idx ? 18 : 6,
                  height: 6,
                  borderRadius: 6,
                  background: i === idx ? "white" : "rgba(255,255,255,.6)",
                  transition: "all .2s ease",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 캡션(탭해도 이동) */}
      {current && (
        <button
          onClick={clickThrough}
          style={{
            marginTop: 8,
            padding: "0 2px",
            fontWeight: 600,
            fontSize: 15,
            textAlign: "left",
            width: "100%",
            background: "transparent",
          }}
        >
          {title}
        </button>
      )}
    </section>
  );
}

function navBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 6,
    transform: "translateY(-50%)",
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.5)",
    background: "rgba(0,0,0,.35)",
    color: "#fff",
    fontSize: 20,
    lineHeight: "30px",
    textAlign: "center",
    backdropFilter: "blur(2px)",
    cursor: "pointer",
    userSelect: "none",
  } as React.CSSProperties;
}

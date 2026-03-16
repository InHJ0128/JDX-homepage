import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import WorkCarousel from "../components/WorkCarousel";
import Footer from "../components/Footer";
import ClubIntro from "../components/ClubIntro";
import { useLanguage } from "../contexts/LanguageContext";

export default function Home() {
  const { language } = useLanguage();
  const t = (ko: string, ja: string) => (language === "ko" ? ko : ja);

  const introCount = 7; // ClubIntro 슬라이드 개수
  const totalPages = 1 + introCount; // 0: 메인, 1..introCount: 소개

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ✅ 스크롤 컨테이너(한 페이지)의 실제 높이(px)
  const [pageH, setPageH] = useState<number>(0);

  // 이미지 로딩
  const [totalImages, setTotalImages] = useState<number | null>(null); // null = 아직 모름
  const [loadedImages, setLoadedImages] = useState(0);

  // ✅ 안전장치: 콜백이 안 와도 2.5초 후엔 소개 공개
  const [forceShow, setForceShow] = useState(false);
  useEffect(() => {
    const tm = setTimeout(() => setForceShow(true), 2500);
    return () => clearTimeout(tm);
  }, []);

  const imagesLoaded =
    forceShow ||
    totalImages === 0 ||
    (totalImages !== null && loadedImages >= totalImages);

  const [activePage, setActivePage] = useState(0);

  // 휠 연속 전환 방지
  const wheelLockRef = useRef(false);
  const wheelAccumRef = useRef(0);

  // 드래그
  const dragRef = useRef({
    dragging: false,
    pointerId: -1,
    startY: 0,
    startScrollTop: 0,
  });

  const clampPage = useCallback(
    (p: number) => Math.max(0, Math.min(totalPages - 1, p)),
    [totalPages]
  );

  const getContainer = () => scrollRef.current;

  // ✅ 컨테이너 높이 측정 (ResizeObserver)
  useEffect(() => {
    const el = getContainer();
    if (!el) return;

    const update = () => setPageH(el.clientHeight || 0);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // 특정 페이지로 이동
  const scrollToPage = useCallback(
    (page: number, behavior: ScrollBehavior = "smooth") => {
      const el = getContainer();
      if (!el) return;

      const target = clampPage(page);
      const h = pageH || el.clientHeight || 1;

      el.scrollTo({ top: target * h, behavior });
    },
    [clampPage, pageH]
  );

  // 가장 가까운 페이지로 스냅
  const snapToNearestPage = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = getContainer();
      if (!el) return;

      const h = pageH || el.clientHeight || 1;
      const p = Math.round(el.scrollTop / h);
      scrollToPage(p, behavior);
    },
    [pageH, scrollToPage]
  );

  // 스크롤로 activePage 업데이트
  useEffect(() => {
    const el = getContainer();
    if (!el) return;

    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = pageH || el.clientHeight || 1;
        const p = Math.round(el.scrollTop / h);
        setActivePage(clampPage(p));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [clampPage, pageH]);

  // ✅ 휠로 페이지 전환 (로딩 전에는 아래 페이지로 못 내려가게 잠금)
  useEffect(() => {
    const el = getContainer();
    if (!el) return;

    const THRESHOLD = 18; // 살짝만 굴려도 넘어가게
    const COOLDOWN_MS = 450;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // 로딩 완료 전: 메인만 보여주기(아래로 내려가지 못하게)
      if (!imagesLoaded) return;

      if (wheelLockRef.current) return;

      wheelAccumRef.current += e.deltaY;
      if (Math.abs(wheelAccumRef.current) < THRESHOLD) return;

      const dir = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;

      wheelLockRef.current = true;
      scrollToPage(activePage + dir, "smooth");

      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, COOLDOWN_MS);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, [activePage, imagesLoaded, scrollToPage]);

  // ✅ 드래그 스크롤(클릭 방해 방지 버전) + 드래그 끝나면 스냅
  useEffect(() => {
    const el = getContainer();
    if (!el) return;

    const DRAG_START_PX = 6;

    const isInteractive = (target: HTMLElement) => {
      return !!target.closest(
        [
          "[data-no-home-drag]",
          "a",
          "button",
          "input",
          "textarea",
          "select",
          "label",
          "[role='button']",
          "[role='link']",
          ".swiper",
          ".swiper-button-next",
          ".swiper-button-prev",
          ".swiper-pagination",
        ].join(",")
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      // 로딩 전: 아래 페이지 이동은 막지만, 캐러셀 클릭은 살아있어야 함
      const target = e.target as HTMLElement | null;
      if (target && isInteractive(target)) return;

      // 로딩 전에는 드래그로 내려가는 것도 막기(메인 고정)
      if (!imagesLoaded) return;

      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragRef.current.dragging = false; // 아직 확정 X
      dragRef.current.pointerId = e.pointerId;
      dragRef.current.startY = e.clientY;
      dragRef.current.startScrollTop = el.scrollTop;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragRef.current.pointerId !== e.pointerId) return;

      const dy = e.clientY - dragRef.current.startY;

      // 일정 거리 이상 움직였을 때만 드래그 시작(클릭 오작동 방지)
      if (!dragRef.current.dragging) {
        if (Math.abs(dy) < DRAG_START_PX) return;
        dragRef.current.dragging = true;
      }

      el.scrollTop = dragRef.current.startScrollTop - dy;
    };

    const endDrag = (e: PointerEvent) => {
      if (dragRef.current.pointerId !== e.pointerId) return;

      const didDrag = dragRef.current.dragging;

      dragRef.current.dragging = false;
      dragRef.current.pointerId = -1;

      // 실제 드래그한 경우에만 스냅
      if (didDrag) snapToNearestPage("smooth");
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
    };
  }, [imagesLoaded, snapToNearestPage]);

  // WorkCarousel 로딩 콜백
  const handleTotalImages = useCallback((n: number) => {
    const safe = Math.max(0, n);
    setTotalImages(safe);
    setLoadedImages(0);
  }, []);

  const handleImageLoad = useCallback(() => {
    setLoadedImages((p) => p + 1);
  }, []);

  const dots = useMemo(() => Array.from({ length: introCount }), [introCount]);

  return (
    <div className="h-full w-full overflow-hidden">
      <div
        id="home-snap-scroll"
        ref={scrollRef}
        className="h-full w-full overflow-y-auto overscroll-y-contain scroll-smooth no-scrollbar select-none"
        style={{
          scrollSnapType: "y mandatory",
          ["--page-h" as any]: pageH ? `${pageH}px` : "100%",
        }}
      >
        {/* 0) 메인 페이지 */}
        <section
          className="w-full snap-start"
          style={{ height: "var(--page-h)", scrollSnapStop: "always" }}
        >
          <div className="h-full w-full flex flex-col items-center justify-center">
            <div className="flex-1 w-full flex flex-col items-center justify-center px-6">
              <div className="text-center select-none">
                <div className="text-xl font-bold text-gray-900">
                  {t("JDX | 부산외대 일본 IT 동아리", "JDX | 釜山外大 日本ITサークル")}
                </div>
              </div>

              {/* ✅ 캐러셀 영역은 드래그 예외 처리 */}
              <div className="w-full max-w-6xl mt-6" data-no-home-drag>
                <WorkCarousel
                  onImageLoad={handleImageLoad}
                  onTotalImages={handleTotalImages}
                />
              </div>

              {/* ✅ 로딩 상태 표시(클릭 방해 X) */}
              {!imagesLoaded && (
                <div className="mt-4 text-sm text-gray-500 pointer-events-none select-none">
                  {t("이미지 로딩 중", "画像読み込み中")}…{" "}
                  {totalImages === null ? "?" : loadedImages}/{totalImages ?? "?"}
                </div>
              )}
            </div>

            {/* 하단바 */}
            <div className="w-full px-6 pb-2" data-no-home-drag>
              <Footer />
            </div>

            {/* SCROLL 표시 */}
            <div className="pb-6 text-center select-none pointer-events-none">
              <div className="text-xl md:text-2xl font-extrabold tracking-[0.25em] text-gray-700">
                SCROLL
              </div>
              <div className="mt-1 text-4xl md:text-5xl font-black animate-bounce text-gray-700">
                ↓
              </div>
            </div>
          </div>
        </section>

        {/* 1..N) 소개 슬라이드: ✅ 이미지 로딩 완료 후에만 표시 */}
        {imagesLoaded && <ClubIntro pageCount={introCount} pageHeight={pageH} />}
      </div>

      {/* intro 구간에만 지원하기 버튼 */}
      {imagesLoaded && activePage >= 1 && (
        <Link
          to="/apply"
          className="fixed right-6 bottom-6 z-50 inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-3 shadow-lg hover:bg-blue-700"
        >
          <span className="font-bold">{t("지원하기", "応募")}</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
            {t("항시 모집", "常時募集")}
          </span>
        </Link>
      )}

      {/* intro 구간 하단 네비(고정) */}
      {imagesLoaded && activePage >= 1 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
          <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur border shadow flex items-center gap-3">
            <button
              onClick={() => scrollToPage(0)}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
              title="Home"
            >
              ⌂
            </button>

            <div className="flex items-center gap-2">
              {dots.map((_, i) => {
                const pageIndex = i + 1;
                const active = activePage === pageIndex;
                return (
                  <button
                    key={pageIndex}
                    onClick={() => scrollToPage(pageIndex)}
                    className={[
                      "w-2.5 h-2.5 rounded-full border transition",
                      active
                        ? "bg-blue-600 border-blue-600 scale-110"
                        : "bg-white border-gray-300 hover:border-gray-400",
                    ].join(" ")}
                    aria-label={`intro page ${pageIndex}`}
                  />
                );
              })}
            </div>

            <div className="text-xs text-gray-600 w-10 text-right tabular-nums">
              {activePage}/{introCount}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
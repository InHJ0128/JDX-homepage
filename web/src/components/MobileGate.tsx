import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const isLikelyMobile = () => {
  const ua = navigator.userAgent || "";
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const mqMobile = !!(window.matchMedia && window.matchMedia("(max-width: 820px)").matches);
  return uaMobile || mqMobile;
};

// 모바일 페이지가 "없는" 데스크톱 전용 경로들은 자동 전환 금지
const DESKTOP_ONLY: RegExp[] = [
  /^\/mypage(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/init(\/|$)/,
];

const isDesktopOnly = (pathname: string) => DESKTOP_ONLY.some((re) => re.test(pathname));

function toMobile(pathname: string) {
  if (pathname === "/" || pathname === "") return "/m";
  if (pathname.startsWith("/works")) return pathname.replace("/works", "/m/works");
  if (pathname.startsWith("/activity")) return pathname.replace("/activity", "/m/activities");
  if (pathname.startsWith("/boards")) return pathname.replace("/boards", "/m/boards");
  if (pathname.startsWith("/login")) return "/m/login";
  if (pathname.startsWith("/logout")) return "/m/logout";
  if (pathname.startsWith('/apply')) return '/m/apply';

  // ✅ 매핑 없는 경로(/mypage 등)는 그대로 둔다
  return pathname;
}

function toDesktop(pathname: string) {
  if (pathname === "/m") return "/";
  if (pathname.startsWith("/m/works")) return pathname.replace("/m/works", "/works");
  if (pathname.startsWith("/m/activities")) return pathname.replace("/m/activities", "/activity");
  if (pathname.startsWith("/m/boards")) return pathname.replace("/m/boards", "/boards");
  if (pathname.startsWith("/m/login")) return "/login";
  if (pathname.startsWith("/m/logout")) return "/logout";
  if (pathname.startsWith('/m/apply')) return '/apply';

  // ✅ 핵심: 매핑 못하는 /m/* 는 홈으로 보내지 말고, /m 만 떼서 데스크톱 경로로 보낸다
  // 예) /m/mypage -> /mypage
  if (pathname.startsWith("/m/")) return pathname.slice(2) || "/";

  return pathname || "/";
}

export default function MobileGate({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const pathname = loc.pathname || "/";
    const onMobilePath = loc.pathname === '/m' || loc.pathname.startsWith('/m/');
    const sp = new URLSearchParams(loc.search);
    const force = sp.get("view"); // ?view=desktop|mobile
    const mobile = isLikelyMobile();

    // 데스크톱 전용 경로는 자동전환 막기 (튕김 방지)
    if (isDesktopOnly(pathname)) return;

    // (옵션) 1회 강제: view 파라미터는 적용 후 제거
    const cleanSearch = () => {
      const p = new URLSearchParams(loc.search);
      p.delete("view");
      const s = p.toString();
      return s ? `?${s}` : "";
    };

    if (force === "mobile" && !onMobilePath) {
      const target = toMobile(pathname);
      if (target !== pathname) nav(target + cleanSearch(), { replace: true });
      return;
    }
    if (force === "desktop" && onMobilePath) {
      const target = toDesktop(pathname);
      if (target !== pathname) nav(target + cleanSearch(), { replace: true });
      return;
    }

    // 자동 전환
    if (mobile && !onMobilePath) {
      const target = toMobile(pathname);
      if (target !== pathname) nav(target, { replace: true });
      return;
    }
    if (!mobile && onMobilePath) {
      const target = toDesktop(pathname);
      if (target !== pathname) nav(target, { replace: true });
      return;
    }
  }, [loc.pathname, loc.search, nav]);

  return <>{children}</>;
}

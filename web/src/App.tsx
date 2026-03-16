// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Works from "./pages/Works";
import Boards from "./pages/Boards";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import ActivityPage from "./pages/ActivityPage";
import MyPage from "./pages/MyPage";
import AdminPage from "./pages/AdminPage";
import InitSetup from "./pages/InitSetup";
import Apply from "./pages/Apply";
import AiPage from "./pages/AiPage";

import MobileHome from "./pages/mobile/MobileHome";
import MobileWorks from "./pages/mobile/MobileWorks";
import MobileBoard from "./pages/mobile/MobileBoard";
import MobileActivity from "./pages/mobile/MobileActivity";
import MobileLogin from "./pages/mobile/MobileLogin";
import MobileLogout from "./pages/mobile/MobileLogout";
import MobileMyPage from "./pages/mobile/MobileMyPage";
import MobileGate from "./components/MobileGate";
import MobileApply from "./pages/mobile/MobileApply";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useLanguage } from "./contexts/LanguageContext";

import axios from "axios";
axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      alert("세션이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.");
      
      // PC/모바일 접속 환경에 따라 알맞은 로그인 페이지로 이동
      if (window.location.pathname.startsWith('/m')) {
        window.location.href = '/m/login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function AppInner() {
  const { user } = useAuth();
  const location = useLocation();
  const { language } = useLanguage();

  const isLoggedIn = !!user;
  const isAdmin = user?.is_admin === 1;
  const isMobileRoute = location.pathname.startsWith("/m");
  const isHomeRoute = location.pathname === "/";

  // ✅ "홈" 버튼 눌렀을 때 (같은 / 라도) 내부 스크롤 컨테이너를 맨 위로
  useEffect(() => {
    const st = location.state as any;
    if (st?.goTop) {
      requestAnimationFrame(() => {
        const el = document.getElementById("app-scroll");
        el?.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, [location.key]);

  return (
    <MobileGate>
      <div className={language === "ja" ? "font-ja" : "font-ko"}>
      {/* ✅ 브라우저(body) 스크롤이 아니라, 아래 #app-scroll만 스크롤되게 */}
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        {!isMobileRoute && <Navbar isLoggedIn={isLoggedIn} isAdmin={isAdmin} />}

        <main
          id="app-scroll"
          className={`flex-1 overscroll-y-contain scroll-smooth ${
            isHomeRoute 
              ? "overflow-hidden p-0" 
              : isMobileRoute 
                ? "overflow-y-auto p-0" /* 모바일일 때 패딩 제거 */
                : "overflow-y-auto p-8" /* PC 일반 페이지일 때만 패딩 8 */
          }`}
        >
          <Routes>
            {/* 데스크톱 라우트 */}
            <Route path="/" element={<Home />} />
            <Route path="/works" element={<Works />} />
            <Route path="/works/:id" element={<Works />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/activity/:id" element={<ActivityPage />} />
            <Route path="/boards" element={<Boards />} />
            <Route path="/boards/:id" element={<Boards />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/init" element={<InitSetup />} />
            <Route path="/apply" element={<Apply />} />
            <Route path="/ai" element={<AiPage />} />

            {/* 모바일 라우트 */}
            <Route path="/m" element={<MobileHome />} />
            <Route path="/m/works" element={<MobileWorks />} />
            <Route path="/m/works/:id" element={<MobileWorks />} />
            <Route path="/m/activities" element={<MobileActivity />} />
            <Route path="/m/activities/:id" element={<MobileActivity />} />
            <Route path="/m/boards" element={<MobileBoard />} />
            <Route path="/m/boards/:id" element={<MobileBoard />} />
            <Route path="/m/login" element={<MobileLogin />} />
            <Route path="/m/logout" element={<MobileLogout />} />
            <Route path="/m/mypage" element={<MobileMyPage />} />
            <Route path="/m/apply" element={<MobileApply />} />
          </Routes>
        </main>
      </div>
      </div>
    </MobileGate>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          {/* ✅ MobileGate를 여기서 또 감싸면 중복 래핑/부작용(스크롤/리다이렉트) 생길 수 있음 */}
          <AppInner />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

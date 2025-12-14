// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Works from "./pages/Works";
import Boards from './pages/Boards';
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import ActivityPage from "./pages/ActivityPage";
import MyPage from "./pages/MyPage";
import AdminPage from './pages/AdminPage';
import InitSetup from './pages/InitSetup';


// ★ 새로 추가할 모바일 전용 페이지(샘플)들
import MobileHome from './pages/mobile/MobileHome';
import MobileWorks from './pages/mobile/MobileWorks';
import MobileBoard from './pages/mobile/MobileBoard';
import MobileActivity from './pages/mobile/MobileActivity';
import MobileLogin from './pages/mobile/MobileLogin';
import MobileLogout from './pages/mobile/MobileLogout';
import MobileGate from './components/MobileGate';

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import axios from "axios";
axios.defaults.withCredentials = true;



function AppInner() {
  const { user } = useAuth();
  const location = useLocation();

  const isLoggedIn = !!user;
  const isAdmin = user?.is_admin === 1;
  const isMobileRoute = location.pathname.startsWith('/m'); // /m/*이면 상단 Navbar 감추고 MobileLayout에서 헤더 사용

  return (
    <MobileGate>
      {!isMobileRoute && (
        <Navbar isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
      )}

      <main className={isMobileRoute ? '' : 'p-8'}>
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
          <Route path="/m/boards" element={<MobileBoard />} />
          <Route path="/m/boards/:id" element={<MobileBoard />} />
        </Routes>
      </main>
    </MobileGate>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <MobileGate>
            <AppInner />
          </MobileGate>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

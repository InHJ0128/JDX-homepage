// src/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

const NAV_LABELS = {
  home: { ko: "홈", ja: "ホーム" },
  activities: { ko: "활동", ja: "活動" },
  works: { ko: "작품", ja: "作品" },
  boards: { ko: "게시판", ja: "掲示板" },
  ai: { ko: "AI", ja: "AI" },
  myPage: { ko: "마이페이지", ja: "マイページ" },
  admin: { ko: "관리자", ja: "管理者" },
  login: { ko: "로그인", ja: "ログイン" },
  logout: { ko: "로그아웃", ja: "ログアウト" },
  apply: { ko: "지원하기", ja: "応募" },
};

export default function Navbar({ isLoggedIn, isAdmin }: Props) {
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();


  const scrollHomeToTop = (behavior: ScrollBehavior = "smooth") => {
    // ✅ Home 내부 스크롤 컨테이너를 맨 위로
    const el = document.getElementById("home-snap-scroll");
    if (el) el.scrollTo({ top: 0, behavior });
  };

  const goHomeTop = (e: React.MouseEvent) => {
    e.preventDefault();

    // 현재 Home이면 즉시 올리기
    scrollHomeToTop("smooth");

    // ✅ 다른 페이지에서 눌러도 Home에서 받아서 맨 위로 올리게 state 전달
    navigate("/", { state: { goTop: Date.now() } });

    // 라우팅/렌더 타이밍 보정 (Home이 막 렌더된 직후도 잡기)
    requestAnimationFrame(() => scrollHomeToTop("smooth"));
  };

  return (
    <nav className="sticky top-0 z-50 flex bg-white items-center justify-between px-6 py-4 shadow">
      {/* 로고도 홈+맨위로 */}
      <Link to="/" onClick={goHomeTop} className="text-2xl font-bold text-blue-600">
        JDX
      </Link>

      {/* 가운데 메뉴 */}
      <ul className="absolute left-1/2 -translate-x-1/2 flex gap-6 text-lg font-medium">
        <li>
          <Link to="/" onClick={goHomeTop} className="hover:text-blue-500">
            {NAV_LABELS.home[language]}
          </Link>
        </li>
        <li>
          <Link to="/activity" className="hover:text-blue-500">
            {NAV_LABELS.activities[language]}
          </Link>
        </li>
        <li>
          <Link to="/works" className="hover:text-blue-500">
            {NAV_LABELS.works[language]}
          </Link>
        </li>
        <li>
          <Link to="/boards" className="hover:text-blue-500">
            {NAV_LABELS.boards[language]}
          </Link>
        </li>
        {isLoggedIn && (
          <li>
            <Link to="/ai" className="hover:text-blue-500">
              {NAV_LABELS.ai[language]}
            </Link>
          </li>
        )}
      </ul>

      {/* 우측 유저/언어 영역 (지원하기는 오른쪽 유지) */}
      <div className="flex items-center space-x-4">
        <Link to="/apply" className="hover:text-blue-500">
          {NAV_LABELS.apply[language]}
        </Link>

        {!isLoggedIn ? (
          <Link to="/login" className="hover:text-blue-500">
            {NAV_LABELS.login[language]}
          </Link>
        ) : (
          <>
            <Link to="/logout" className="text-red-600 hover:text-red-300">
              {NAV_LABELS.logout[language]}
            </Link>
            <Link to="/mypage" className="hover:text-blue-500">
              {NAV_LABELS.myPage[language]}
            </Link>
            {isAdmin && (
              <Link to="/admin" className="hover:text-blue-500">
                {NAV_LABELS.admin[language]}
              </Link>
            )}
          </>
        )}

        <button
          onClick={toggleLanguage}
          className="text-sm px-3 py-1 border rounded hover:bg-gray-100"
        >
          {language === "ko" ? "🇯🇵 日本語" : "🇰🇷 한국어"}
        </button>
      </div>
    </nav>
  );
}

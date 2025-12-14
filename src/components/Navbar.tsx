// src/components/Navbar.tsx
import { Link } from "react-router-dom";
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
  myPage: { ko: "마이페이지", ja: "マイページ" },
  admin: { ko: "관리자", ja: "管理者" },
  login: { ko: "로그인", ja: "ログイン" },
  logout: { ko: "로그아웃", ja: "ログアウト" },
};

export default function Navbar({ isLoggedIn, isAdmin }: Props) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 flex bg-white items-center justify-between px-6 py-4 shadow">
      <Link to="/" className="text-2xl font-bold text-blue-600">
        JDX
      </Link>

      {/* 가운데 메뉴 */}
      <ul className="absolute left-1/2 -translate-x-1/2 flex gap-6 text-lg font-medium">
        <li>
          <Link to="/" className="hover:text-blue-500">
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
      </ul>

      {/* 우측 유저/언어 영역 */}
      <div className="flex items-center space-x-4">
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

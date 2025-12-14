import { useState } from 'react';
import { useLanguage } from "../contexts/LanguageContext";
import UserList from './admin/UserList';
import ActivityList from './admin/ActivityList';
import WorkList from './admin/WorkList';
import HomeHighlightSetting from './admin/HomeHighlightSetting';
import FooterNavigationSetting from './admin/FooterNavigationSetting';

const AdminPage = () => {
  const [selectedMenu, setSelectedMenu] = useState('users');
  const [showGuide, setShowGuide] = useState(false);
  const { language } = useLanguage();
  
  const renderContent = () => {
    switch (selectedMenu) {
      case 'users':
        return <UserList />;
      case 'activities':
        return <ActivityList />;
      case 'works':
        return <WorkList />;
      case 'home-Highlight':
        return <HomeHighlightSetting />;
      case 'footer-nav':
        return <FooterNavigationSetting />;
      default:
        return null;
    }
  };
  const GUIDE_TEXTS = {
    users: {
      ko: [
        "새 유저를 추가하면 ID/비밀번호가 닉네임과 동일하게 설정됩니다.",
        "admin 계정은 삭제하거나 권한 변경이 불가능합니다.",
        "현재 로그인한 계정은 삭제할 수 없습니다.",
      ],
      ja: [
        "新しいユーザーを追加すると、IDとパスワードはニックネームと同じに設定されます。",
        "adminアカウントは削除や権限変更ができません。",
        "現在ログインしているアカウントは削除できません。",
      ],
    },
    activities: {
      ko: [
        "제목과 내용을 한국어/일본어로 모두 입력해주세요.",
        "대표 이미지와 썸네일은 꼭 업로드해주세요.",
        "‘강조하기’를 선택하면 목록 상단에 노출됩니다.",
        "‘숨기기’를 선택하면 사용자 화면에 보이지 않습니다.",
      ],
      ja: [
        "タイトルと内容は韓国語・日本語の両方を入力してください。",
        "代表画像とサムネイルは必ずアップロードしてください。",
        "「強調する」を選択すると一覧の上部に表示されます。",
        "「非表示」を選択するとユーザー画面に表示されません。",
      ],
    },
    works: {
      ko: [
        "작품은 이미지와 함께 등록하면 사용자에게 보기 좋습니다.",
        "작품 설명은 한국어/일본어 모두 작성해주세요.",
        "썸네일을 업로드하면 목록에서 시각적으로 구분됩니다.",
      ],
      ja: [
        "作品は画像と一緒に登録するとユーザーに見やすくなります。",
        "作品説明は韓国語・日本語の両方を記入してください。",
        "サムネイルをアップロードすると一覧で見やすくなります。",
      ],
    },
    "home-Highlight": {
      ko: [
        "홈 화면 상단에 표시될 이미지를 설정합니다.",
        "큰 가로 이미지를 권장합니다.",
      ],
      ja: [
        "ホーム画面上部に表示される画像を設定します。",
        "横長の大きな画像を推奨します。",
      ],
    },
    "footer-nav": {
      ko: [
        "하단에 표시될 외부/내부 링크를 설정합니다.",
        "링크는 최대 5개까지 추가 가능합니다.",
      ],
      ja: [
        "フッターに表示される外部/内部リンクを設定します。",
        "リンクは最大5つまで追加できます。",
      ],
    },
  };
  const currentGuide = GUIDE_TEXTS[selectedMenu as keyof typeof GUIDE_TEXTS]?.[language] || [];

  return (
    <div className="flex h-screen flex-col">
      {/* 가이드 공지창 */}
      {showGuide && (
        <div className="bg-yellow-100 text-yellow-800 p-4 border-b border-yellow-300 flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg mb-2">
              {language === "ko" ? "📌 가이드" : "📌 ガイド"}
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {currentGuide.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setShowGuide(false)}
            className="text-yellow-900 hover:text-red-600 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 상단 툴바 */}
      <div className="flex justify-between items-center p-2 bg-gray-200 border-b">
        <h1 className="text-xl font-bold">
          {language === "ko" ? "관리자 페이지" : "管理者ページ"}
        </h1>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          {showGuide
            ? (language === "ko" ? "가이드 닫기" : "ガイドを閉じる")
            : (language === "ko" ? "가이드 보기" : "ガイドを見る")}
        </button>
      </div>

      {/* 본문 */}
      <div className="flex flex-1">
        {/* 사이드 메뉴 */}
        <aside className="w-64 bg-gray-100 p-4 border-r">
          <h2 className="text-xl font-bold mb-4">
            {language === "ko" ? "관리자 메뉴" : "管理者メニュー"}
          </h2>
          <ul className="space-y-2">
            <li><button onClick={() => setSelectedMenu('users')} className="hover:underline">👤 {language === "ko" ? "사용자 목록" : "ユーザー一覧"}</button></li>
            <li><button onClick={() => setSelectedMenu('activities')} className="hover:underline">📋 {language === "ko" ? "활동 목록" : "活動一覧"}</button></li>
            <li><button onClick={() => setSelectedMenu('works')} className="hover:underline">🎨 {language === "ko" ? "작품 목록" : "作品一覧"}</button></li>
            <li><button onClick={() => setSelectedMenu('home-Highlight')} className="hover:underline">🏠 {language === "ko" ? "JDX 소개 사진 설정" : "JDX紹介画像設定"}</button></li>
            <li><button onClick={() => setSelectedMenu('footer-nav')} className="hover:underline">🔗 {language === "ko" ? "하단 네비 설정" : "フッターナビ設定"}</button></li>
          </ul>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
};

export default AdminPage;

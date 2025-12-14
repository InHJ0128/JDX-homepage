// src/pages/mobile/MobileLayout.tsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

type Props = {
  title?: string;
  children: React.ReactNode;
};

const LABELS = {
  menu:       { ko: '메뉴',     ja: 'メニュー' },
  home:       { ko: '홈',       ja: 'ホーム' },
  activities: { ko: '활동',     ja: '活動' },
  works:      { ko: '작품',     ja: '作品' },
  boards:     { ko: '게시판',   ja: '掲示板' }, // ✅ 추가
  login:      { ko: '로그인',   ja: 'ログイン' },
  logout:     { ko: '로그아웃', ja: 'ログアウト' },
  mypage:     { ko: '개인설정', ja: '個人設定' },
  pcview:     { ko: 'PC 버전 보기', ja: 'PC版で見る' },
};

export default function MobileLayout({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { language, toggleLanguage } = useLanguage();

  // 라우트가 바뀌면 메뉴 자동 닫기
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // 메뉴 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : prev || '';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const toggle = () => setOpen(o => !o);
  const close = () => setOpen(false);

  return (
    <div style={{ minHeight: '100dvh', background: '#fff' }}>
      {/* 상단 바 */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          height: 54, display: 'flex', alignItems: 'center',
          padding: '0 12px', background: '#111', color: '#fff'
        }}
      >
        {/* 햄버거 버튼 */}
        <button
          type="button"
          onClick={toggle}
          aria-label="메뉴 열기"
          aria-expanded={open}
          aria-controls="mobile-drawer"
          style={{
            width: 36, height: 36, border: 'none', background: 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 8, cursor: 'pointer'
          }}
        >
          <span style={{ position: 'relative', width: 22, height: 16, display: 'inline-block' }}>
            <i style={barStyle(open ? -8 : -6, open ? 100 : 100, 0)} />
            <i style={barStyle(0,              open ? 60  : 100, open ? 5  : 0)} />
            <i style={barStyle(open ? 8  : 6,  open ? 100 : 100, 0)} />
          </span>
        </button>

        {/* 타이틀 */}
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, letterSpacing: .2 }}>
          {title || 'JDX'}
        </div>

        {/* 우측 공간 맞춤용 */}
        <div style={{ width: 36 }} />
      </header>

      {/* 본문 */}
      <main style={{ padding: 12 }}>{children}</main>

      {/* 오버레이 */}
      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
            zIndex: 40, backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* 사이드 드로어 */}
      <nav
        id="mobile-drawer"
        role="dialog"
        aria-label="모바일 메뉴"
        style={{
          position: 'fixed', zIndex: 41, top: 0, left: 0, height: '100dvh',
          width: '78%', maxWidth: 320, background: '#fff',
          boxShadow: '2px 0 12px rgba(0,0,0,.18)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .22s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 12, paddingTop: 18, borderBottom: '1px solid #eee', display:'flex', alignItems:'center' }}>
          <strong style={{ fontSize: 18 }}>{LABELS.menu[language]}</strong>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={close}
            style={{
              marginLeft: 'auto', width: 32, height: 32, border: 'none', background: 'transparent',
              fontSize: 22, lineHeight: '32px', cursor: 'pointer'
            }}
          >×</button>
        </div>

        {/* 인증 관련 */}
        <div style={{ padding: '10px 10px', borderBottom: '1px solid #f4f4f4' }}>
          {!isLoggedIn ? (
            <Link to="/m/login" onClick={close} style={{ ...linkStyle, padding: 0, color: '#0a58ca' }}>
              {LABELS.login[language]}
            </Link>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              <Link to="/mypage" onClick={close} style={{ ...linkStyle, padding: 0, fontWeight: 600 }}>
                {LABELS.mypage[language]}
              </Link>
              <Link to="/m/logout" onClick={close} style={{ ...linkStyle, padding: 0, color: '#c00' }}>
                {LABELS.logout[language]}
              </Link>
            </div>
          )}
        </div>

        {/* 메뉴: 홈 → 활동 → 작품 → 게시판 */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 8 }}>
          <MobileNavItem to="/m"           label={LABELS.home[language]}       onClick={close} />
          <MobileNavItem to="/m/activities" label={LABELS.activities[language]} onClick={close} />
          <MobileNavItem to="/m/works"     label={LABELS.works[language]}      onClick={close} />
          <MobileNavItem to="/m/boards"    label={LABELS.boards[language]}     onClick={close} /> {/* ✅ 추가 */}
        </ul>

        {/* 하단: 언어 변경 등 */}
        <div style={{ marginTop: 'auto', padding: 10, borderTop: '1px solid #eee' }}>
          <button
            onClick={() => { toggleLanguage(); }}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer', marginBottom: 8
            }}
          >
            {language === 'ko' ? '🇯🇵 日本語로 보기' : '🇰🇷 한국어로 보기'}
          </button>
        </div>
      </nav>
    </div>
  );
}

function barStyle(translateY: number, widthPct: number, leftPx: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: leftPx,
    right: 0,
    height: 2,
    background: '#fff',
    transform: `translateY(${translateY}px)`,
    width: `${widthPct}%`,
    transition: 'transform .22s ease, width .22s ease, left .22s ease',
    borderRadius: 2,
  };
}

function MobileNavItem({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  return (
    <li>
      <Link to={to} onClick={onClick} style={linkStyle}>
        {label}
      </Link>
    </li>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'block',
  padding: '12px 10px',
  color: '#111',
  textDecoration: 'none',
  fontSize: 16,
};

import { Link } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import MobileCarousel from '../../components/mobile/MobileCarousel';
import { useLanguage } from '../../contexts/LanguageContext';

export default function MobileHome() {
  const { language } = useLanguage();

  return (
    <MobileLayout title="JDX">
      {/* 1. 자동 순환 캐러셀 */}
      <MobileCarousel />

      <section style={{ marginTop: 24, padding: '0 4px' }}>
        
        {/* 2. 빠른 이동 메뉴 (Quick Links) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: 12, 
          marginBottom: 32 
        }}>
          <QuickLink to="/m/activities" label={language === 'ko' ? '활동' : '活動'} icon="🔥" />
          <QuickLink to="/m/works" label={language === 'ko' ? '작품' : '作品'} icon="🎨" />
          <QuickLink to="/m/boards" label={language === 'ko' ? '게시판' : '掲示板'} icon="💬" />
          <QuickLink to="/m/apply" label={language === 'ko' ? '지원' : '応募'} icon="✨" />
        </div>

        {/* 3. 최근 활동 프리뷰 영역 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              {language === 'ko' ? '최근 활동' : '最近の活動'}
            </h2>
            <Link to="/m/activities" style={{ fontSize: 13, color: '#0a58ca', textDecoration: 'none', fontWeight: 600 }}>
              {language === 'ko' ? '더보기 >' : 'もっと見る >'}
            </Link>
          </div>
          
          {/* API 데이터를 불러와서 렌더링할 자리 (임시 UI) */}
          <div style={{ 
            height: 140, 
            background: '#f8f9fa', 
            borderRadius: 14, 
            border: '1px solid #eee',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#888',
            fontSize: 14
          }}>
            {language === 'ko' ? '최근 활동 로딩 중...' : '最近の活動を読み込み中...'}
          </div>
        </div>

      </section>
    </MobileLayout>
  );
}

// 빠른 이동 메뉴용 컴포넌트
function QuickLink({ to, label, icon }: { to: string, label: string, icon: string }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', color: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ 
        width: 56, height: 56, borderRadius: '50%', background: '#f4f4f4', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </Link>
  );
}
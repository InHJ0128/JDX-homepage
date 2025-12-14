import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { useLanguage } from '../../contexts/LanguageContext';

export default function MobileLogout() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
      } catch {}
      // 세션/쿠키 기반이면 이 정도로 충분. 필요시 localStorage 토큰 등도 정리
      // localStorage.removeItem('your_token');
      navigate('/m', { replace: true });
    })();
  }, [navigate]);

  return (
    <MobileLayout title={language === 'ko' ? '로그아웃' : 'ログアウト'}>
      <p style={{ color:'#666' }}>{language === 'ko' ? '로그아웃 중…' : 'ログアウト中…'}</p>
    </MobileLayout>
  );
}

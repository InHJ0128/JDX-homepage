import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext'; // ✅ useAuth 추가

export default function MobileLogout() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { setUser } = useAuth(); // ✅ setUser 가져오기

  useEffect(() => {
    (async () => {
      try {
        await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
      } catch (err) {
        console.error("로그아웃 API 호출 실패:", err);
      }
      
      // ✅ 프론트엔드에 남아있는 로그인 정보(토큰/상태) 완벽히 지우기
      localStorage.removeItem('user');
      setUser(null);

      // 홈으로 이동
      navigate('/m', { replace: true });
    })();
  }, [navigate, setUser]);

  return (
    <MobileLayout title={language === 'ko' ? '로그아웃' : 'ログアウト'}>
      <p style={{ color:'#666', padding: '20px' }}>
        {language === 'ko' ? '로그아웃 완료. 이동 중…' : 'ログアウト完了。移動中…'}
      </p>
    </MobileLayout>
  );
}
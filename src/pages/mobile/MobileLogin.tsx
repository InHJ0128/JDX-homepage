import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { http } from '../../api/http';

type LoginResp = {
  user?: { id: string; nickname: string; is_admin: number };
  needInit?: boolean;
  id?: string;
  message?: string;
};

export default function MobileLogin() {
  const { language } = useLanguage();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const t = (ko: string, ja: string) => (language === 'ko' ? ko : ja);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      // ✅ PC와 동일: /login 엔드포인트 + { id, password }
      const data = await http<LoginResp>('/login', {
        method: 'POST',
        body: JSON.stringify({ id, password }),
      });

      // 서버가 message를 주는 분기(초기화 등)도 PC와 동일하게 처리
      if (data.message) {
        alert(data.message);
        if (data.needInit) {
          const tempUser = { id: data.id!, nickname: data.id!, is_admin: 0 };
          localStorage.setItem('user', JSON.stringify(tempUser));
          setUser(tempUser);
          navigate('/init'); // 초기 설정 페이지
          return;
        }
        return;
      }

      if (!data.user) {
        alert(t('로그인된 사용자 정보가 없습니다.', 'ログイン済みのユーザー情報がありません。'));
        return;
      }

      // ✅ 전역 상태 + 로컬스토리지 동기화(중요!)
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

      // 모바일 홈으로 이동
      navigate('/m', { replace: true });
    } catch (e: any) {
      console.error(e);
      setErr(t('서버 연결 실패', 'サーバー接続に失敗しました。'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileLayout title={t('로그인', 'ログイン')}>
      <form onSubmit={onSubmit} style={{ display:'grid', gap:12 }}>
        <label style={{ display:'grid', gap:6 }}>
          <span style={{ fontSize:13, color:'#666' }}>{t('아이디', 'アイディー')}</span>
          <input
            value={id} onChange={e=>setId(e.target.value)}
            type="text" required
            placeholder={t('아이디', 'アイディー')}
            style={{ padding:'12px 14px', border:'1px solid #ddd', borderRadius:10 }}
          />
        </label>

        <label style={{ display:'grid', gap:6 }}>
          <span style={{ fontSize:13, color:'#666' }}>{t('비밀번호', 'パスワード')}</span>
          <input
            value={password} onChange={e=>setPassword(e.target.value)}
            type="password" required
            placeholder={t('비밀번호', 'パスワード')}
            style={{ padding:'12px 14px', border:'1px solid #ddd', borderRadius:10 }}
          />
        </label>

        {err && <p style={{ color:'#c00', fontSize:13 }}>{err}</p>}

        <button
          type="submit" disabled={busy}
          style={{
            padding:'12px 14px', borderRadius:10, border:'1px solid #111',
            background:'#111', color:'#fff', fontWeight:700
          }}
        >
          {busy ? t('로그인 중…', 'ログイン中…') : t('로그인', 'ログイン')}
        </button>
      </form>
    </MobileLayout>
  );
}

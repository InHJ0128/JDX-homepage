import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { useLanguage } from '../../contexts/LanguageContext';

type Activity = {
  id: number;
  title: string;
  content: string;
  thumbnail_url?: string;
  image_url?: string;
  created_at: string;
};

function stripHtml(html: string) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || '';
}

export default function MobileActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [list, setList] = useState<Activity[]>([]);
  const [item, setItem] = useState<Activity | null>(null);
  const isDetail = !!id;

  // 목록
  useEffect(() => {
    if (!isDetail) {
      fetch(`/api/user/activities?lang=${language}`)
        .then(r => r.json())
        .then(setList)
        .catch(console.error);
    }
  }, [isDetail, language]);

  // 상세
  useEffect(() => {
    if (isDetail && id) {
      fetch(`/api/user/activities/${id}?lang=${language}`)
        .then(r => r.json())
        .then(setItem)
        .catch(console.error);
    }
  }, [isDetail, id, language]);

  // 상세 화면
  if (isDetail && item) {
    return (
      <MobileLayout title={language === 'ko' ? '활동' : '活動'}>
        <article>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{item.title}</h1>
          <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
            {new Date(item.created_at).toLocaleDateString()}
          </p>

          <div
            style={{ lineHeight: 1.6 }}
            // 서버에서 XSS 필터링 전제 (데스크톱도 동일 방식) :contentReference[oaicite:3]{index=3}
            dangerouslySetInnerHTML={{ __html: item.content }}
          />

          <button
            onClick={() => navigate('/m/activities')}
            style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 10,
              border: '1px solid #eee', width: '100%'
            }}
          >
            {language === 'ko' ? '← 목록으로' : '← 一覧へ'}
          </button>
        </article>
      </MobileLayout>
    );
  }

  // 목록 화면
  return (
    <MobileLayout title={language === 'ko' ? '활동' : '活動'}>
      <ul style={{ display: 'grid', gap: 12 }}>
        {list.map((a) => (
          <li
            key={a.id}
            onClick={() => navigate(`/m/activities/${a.id}`)}
            style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: 12, border: '1px solid #eee', borderRadius: 12,
              cursor: 'pointer', background: '#fff'
            }}
          >
            {a.thumbnail_url && (
              <img
                src={a.thumbnail_url}
                alt={a.title}
                style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, flex: '0 0 auto' }}
                loading="lazy"
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 700, marginBottom: 4, fontSize: 16,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {a.title}
              </div>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>
                {new Date(a.created_at).getFullYear()}
              </div>
              <div style={{ color: '#555', fontSize: 14, lineHeight: 1.4 }}>
                {stripHtml(a.content).slice(0, 70)}…
              </div>
            </div>
          </li>
        ))}
      </ul>
    </MobileLayout>
  );
}

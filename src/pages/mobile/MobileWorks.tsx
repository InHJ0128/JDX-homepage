import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { useLanguage } from '../../contexts/LanguageContext';

type Work = { id: number; title: string; content: string; thumbnail_url?: string; created_at: string };

function stripHtml(html: string) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || '';
}

export default function MobileWorks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [works, setWorks] = useState<Work[]>([]);
  const [work, setWork] = useState<Work | null>(null);

  // 목록
  useEffect(() => {
    if (!id) {
      fetch(`/api/user/work?lang=${language}`).then(r => r.json()).then(setWorks).catch(console.error);
    }
  }, [id, language]);

  // 상세
  useEffect(() => {
    if (id) {
      fetch(`/api/user/work/${id}?lang=${language}`).then(r => r.json()).then(setWork).catch(console.error);
    }
  }, [id, language]);

  // 상세 화면
  if (id && work) {
    return (
      <MobileLayout title={language === 'ko' ? '작품' : '作品'}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{work.title}</h1>
        <p style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
          {new Date(work.created_at).toLocaleDateString()}
        </p>
        <div
          style={{ lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: work.content }}
        />
        <button
          onClick={() => navigate('/m/works')}
          style={{ marginTop: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid #eee' }}
        >
          {language === 'ko' ? '← 목록으로' : '← 一覧へ'}
        </button>
      </MobileLayout>
    );
  }

  // 목록 화면
  return (
    <MobileLayout title={language === 'ko' ? '작품' : '作品'}>
      <ul style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {works.map(w => (
          <li
            key={w.id}
            onClick={() => navigate(`/m/works/${w.id}`)}
            style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: 12, border: '1px solid #eee', borderRadius: 12, cursor: 'pointer'
            }}
          >
            {w.thumbnail_url && (
              <img
                src={w.thumbnail_url}
                alt={w.title}
                style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, flex: '0 0 auto' }}
                loading="lazy"
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {w.title}
              </div>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>
                {new Date(w.created_at).getFullYear()}
              </div>
              <div style={{ color: '#555', fontSize: 14, lineHeight: 1.4 }}>
                {stripHtml(w.content).slice(0, 60)}…
              </div>
            </div>
          </li>
        ))}
      </ul>
    </MobileLayout>
  );
}

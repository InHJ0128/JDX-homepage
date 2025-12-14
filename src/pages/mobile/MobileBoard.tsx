import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import BoardForm from '../../components/BoardForm';
import BoardComments from '../../components/BoardComments';
import TagSelector from '../../components/TagSelector';
import MobileLayout from '../../components/mobile/MobileLayout';

export default function MobileBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [list, setList] = useState<any[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [q, setQ] = useState('');
  const [selTags, setSelTags] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const isAdmin = user?.is_admin === 1;

  const tTitle = (b: any) => (language === 'ko' ? b.title_ko : b.title_ja);

  const headerTitle = useMemo(() => {
    if (!id) return language === 'ko' ? '게시판' : '掲示板';
    if (id === 'new') return language === 'ko' ? '새 글' : '新規投稿';
    if (detail) return tTitle(detail);
    return language === 'ko' ? '게시판' : '掲示板';
  }, [id, detail, language]);

  const loadList = async () => {
    const params: any = {};
    if (q) params.q = q;
    if (selTags.length) params.tags = selTags.join(',');
    const { data } = await axios.get('/api/boards', { params });
    setList(Array.isArray(data) ? data : []);
  };
  const loadOne = async (boardId: string) => {
    const { data } = await axios.get(`/api/boards/${boardId}`);
    setDetail(data);
    setEditMode(false);
  };

  useEffect(() => {
    if (!id) {
      loadList();
    } else if (id !== 'new') {
      loadOne(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <MobileLayout title={headerTitle}>
      {/* 목록 */}
      {!id && (
        <>
          <div className="mb-4 space-y-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={language === 'ko' ? '검색' : '検索'}
              className="w-full border px-3 py-2 rounded"
            />
            <TagSelector value={selTags} onChange={setSelTags} />
            <button
              onClick={loadList}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded"
            >
              {language === 'ko' ? '검색' : '検索'}
            </button>
            {user && (
              <button
                onClick={() => navigate('/m/boards/new')}
                className="w-full px-3 py-2 border rounded"
              >
                {language === 'ko' ? '새 글' : '新規投稿'}
              </button>
            )}
          </div>

          <ul className="space-y-3">
            {list.map((b) => (
              <li
                key={b.id}
                onClick={() => navigate(`/m/boards/${b.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/m/boards/${b.id}`);
                }}
                role="button"
                tabIndex={0}
                className="border rounded p-3 hover:shadow cursor-pointer transition"
              >
                <h3 className="font-bold mb-1">{tTitle(b)}</h3>
                <p className="text-sm text-gray-500 mb-1">
                  {(b.tag_names || '')
                    .split(',')
                    .filter(Boolean)
                    .map((t: string) => (
                      <span key={t} className="mr-1">#{t}</span>
                    ))}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 상세 */}
      {id && id !== 'new' && detail && !editMode && (
        <article className="prose max-w-none">
          <div className="flex justify-between items-center gap-2">
            <h1 className="text-xl font-bold">{tTitle(detail)}</h1>
            {(() => {
              const uid = user ? Number(user.id) : null;
              const ownerId = Number(detail.user_id);
              const canEdit = !!user && (isAdmin || uid === ownerId);
              return (
                canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-3 py-1 border rounded"
                    >
                      {language === 'ko' ? '수정' : '編集'}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(language === 'ko' ? '삭제할까요?' : '削除しますか？')) {
                          await axios.delete(`/api/boards/${id}`);
                          navigate('/m/boards');
                        }
                      }}
                      className="px-3 py-1 border rounded text-red-600"
                    >
                      {language === 'ko' ? '삭제' : '削除'}
                    </button>
                  </div>
                )
              );
            })()}
          </div>

          <p className="text-sm text-gray-500">
            {(detail.tag_names || '')
              .split(',')
              .filter(Boolean)
              .map((t: string) => (
                <span key={t} className="mr-2">#{t}</span>
              ))}
          </p>

          {/* 코드 표시 제거됨 */}

          <div className="my-6 whitespace-pre-wrap">
            {language === 'ko' ? detail.body_ko : detail.body_ja}
          </div>

          <BoardComments boardId={detail.id} />
        </article>
      )}

      {/* 새 글 / 수정 */}
      {id === 'new' && user && (
        <BoardForm
          mode="create"
          onSaved={(newId) => navigate(`/m/boards/${newId}`)}
        />
      )}
      {id && id !== 'new' && detail && user && editMode && (
        <div className="border rounded p-3">
          <BoardForm
            mode="edit"
            board={detail}
            onSaved={() => {
              setEditMode(false);
              loadOne(String(detail.id));
            }}
          />
        </div>
      )}
    </MobileLayout>
  );
}

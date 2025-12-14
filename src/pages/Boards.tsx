import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import BoardForm from '../components/BoardForm';
import BoardComments from '../components/BoardComments';
import TagSelector from '../components/TagSelector';

export default function BoardPage() {
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
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 목록 화면 */}
      {!id && (
        <>
          <div className="mb-6 flex gap-3 items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색"
              className="border px-3 py-2 rounded w-60"
            />
            <TagSelector value={selTags} onChange={setSelTags} />
            <button
              onClick={loadList}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {(language === 'ko' ?'검색':'検索')}
            </button>
            {user && (
              <button
                onClick={() => navigate('/boards/new')}
                className="px-3 py-2 border rounded"
              >
                {(language === 'ko' ?'새 글':'作成')}
              </button>
            )}
          </div>

          <ul className="grid md:grid-cols-2 gap-4">
            {list.map((b) => (
              <li
                key={b.id}
                onClick={() => navigate(`/boards/${b.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/boards/${b.id}`); }}
                role="button"
                tabIndex={0}
                className="border rounded p-4 hover:shadow transition cursor-pointer"
              >
                <h3 className="text-xl font-bold mb-1">{tTitle(b)}</h3>
                <p className="text-sm text-gray-500">
                  {(b.tag_names || '').split(',').filter(Boolean).map((t:string)=>(
                    <span key={t} className="mr-2">#{t}</span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 상세 화면 */}
      {id && id !== 'new' && detail && !editMode && (
        <article className="prose max-w-none">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{tTitle(detail)}</h1>
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
                      {(language === 'ko' ?'수정':'修正')}
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('삭제할까요?')) {
                          await axios.delete(`/api/boards/${id}`);
                          navigate('/boards');
                        }
                      }}
                      className="px-3 py-1 border rounded text-red-600"
                    >
                      {(language === 'ko' ?'삭제':'削除')}
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

          {/* ✅ 코드 표시 블록 제거됨 */}

          <div className="my-6 whitespace-pre-wrap">
            {language === 'ko' ? detail.body_ko : detail.body_ja}
          </div>

          <BoardComments boardId={detail.id} />
        </article>
      )}

      {/* 새 글 / 수정 폼 */}
      {id === 'new' && user && (
        <BoardForm mode="create" onSaved={(newId) => navigate(`/boards/${newId}`)} />
      )}
      {id && id !== 'new' && detail && user && editMode && (
        <div className="border rounded p-4">
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
    </div>
  );
}






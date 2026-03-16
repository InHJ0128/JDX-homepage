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

  // 다국어 텍스트 사전 구성
  const t = {
    title: language === 'ko' ? '게시판' : '掲示板',
    searchPlaceholder: language === 'ko' ? '검색어 입력' : '検索語を入力',
    searchBtn: language === 'ko' ? '검색' : '検索',
    newPostBtn: language === 'ko' ? '새 글 작성' : '新規作成',
    editBtn: language === 'ko' ? '수정' : '編集',
    deleteBtn: language === 'ko' ? '삭제' : '削除',
    deleteConfirm: language === 'ko' ? '정말 삭제하시겠습니까?' : '本当に削除しますか？',
    backToList: language === 'ko' ? '목록으로' : '一覧へ',
    emptyList: language === 'ko' ? '등록된 게시글이 없습니다.' : '登録された投稿がありません。',
  };

  const tTitle = (b: any) => (language === 'ko' ? b.title_ko : b.title_ja);
  const tBody = (b: any) => (language === 'ko' ? b.body_ko : b.body_ja);

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 1. 목록 화면 */}
      {!id && (
        <div className="space-y-6">
          {/* 상단 헤더 및 검색 영역 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-800">{t.title}</h1>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="flex-1 md:flex-none w-full md:w-56 border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
              <TagSelector value={selTags} onChange={setSelTags} />
              <button
                onClick={loadList}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                {t.searchBtn}
              </button>
              {user && (
                <button
                  onClick={() => navigate('/boards/new')}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg shadow-sm transition-colors"
                >
                  {t.newPostBtn}
                </button>
              )}
            </div>
          </div>

          {/* 게시글 목록 그리드 */}
          {list.length === 0 ? (
            <div className="py-16 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              {t.emptyList}
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((b) => (
                <li
                  key={b.id}
                  onClick={() => navigate(`/boards/${b.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/boards/${b.id}`); }}
                  role="button"
                  tabIndex={0}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
                >
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                      {tTitle(b)}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-4">
                    {(b.tag_names || '').split(',').filter(Boolean).map((t: string) => (
                      <span key={t} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-md">
                        #{t}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 2. 상세 화면 */}
      {id && id !== 'new' && detail && !editMode && (
        <article className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {tTitle(detail)}
            </h1>
            
            <div className="flex gap-2 shrink-0">
              {(() => {
                const uid = user ? Number(user.id) : null;
                const ownerId = Number(detail.user_id);
                const canEdit = !!user && (isAdmin || uid === ownerId);
                return (
                  canEdit && (
                    <>
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t.editBtn}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(t.deleteConfirm)) {
                            await axios.delete(`/api/boards/${id}`);
                            navigate('/boards');
                          }
                        }}
                        className="px-4 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        {t.deleteBtn}
                      </button>
                    </>
                  )
                );
              })()}
              <button
                onClick={() => navigate('/boards')}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t.backToList}
              </button>
            </div>
          </div>

          {/* 태그 영역 */}
          {detail.tag_names && (
            <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-gray-100">
              {(detail.tag_names || '')
                .split(',')
                .filter(Boolean)
                .map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                    #{tag}
                  </span>
                ))}
            </div>
          )}

          {/* 본문 영역 */}
          <div className="prose max-w-none text-gray-800 my-8 whitespace-pre-wrap leading-relaxed">
            {tBody(detail)}
          </div>

          {/* 댓글 컴포넌트 */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <BoardComments boardId={detail.id} />
          </div>
        </article>
      )}

      {/* 3. 새 글 작성 폼 */}
      {id === 'new' && user && (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10">
          <h2 className="text-2xl font-bold mb-6">{t.newPostBtn}</h2>
          <BoardForm mode="create" onSaved={(newId) => navigate(`/boards/${newId}`)} />
        </div>
      )}

      {/* 4. 수정 폼 */}
      {id && id !== 'new' && detail && user && editMode && (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{t.editBtn}</h2>
            <button
              onClick={() => setEditMode(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              취소 (キャンセル)
            </button>
          </div>
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
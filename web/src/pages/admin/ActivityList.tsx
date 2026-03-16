import React, { useEffect, useRef, useState, type ChangeEvent } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { convertToWebP } from './utils/image';
import { useLanguage } from "../../contexts/LanguageContext";

type FileTarget = 'image' | 'thumbnail';

interface Activity {
  id: number;
  title: string;
  title_ja: string;
  content: string;
  content_ja: string;
  created_at: string;
  emphasized: boolean | number | string;
  hidden: boolean | number | string;
  image_url?: string;
  thumbnail_url?: string;

  // ✅ 서버가 is_hidden / is_emphasized 같은 키로 내려줄 수 있어 확장 허용
  [key: string]: any;
}

interface ActivityForm {
  id: number | null;
  title: string;
  title_ja: string;
  content: string;
  content_ja: string;
  emphasized: boolean;
  hidden: boolean;
  imageFile: File | null;
  thumbnailFile: File | null;
}

interface ActivityDetail {
  id: number;
  title: string | null;
  title_ja: string | null;
  content: string | null;
  content_ja: string | null;
  emphasized: number | boolean | string | null;
  hidden: number | boolean | string | null;
  image_url: string | null;
  thumbnail_url: string | null;

  [key: string]: any;
}

const ASSET_ORIGIN =
  import.meta.env.VITE_UPLOAD_ORIGIN || window.location.origin;

const fixUploadUrl = (u?: string | null): string => {
  if (!u) return '';
  if (/^https?:\/\//.test(u)) return u;
  const path = u.startsWith('/uploads/') ? u : `/uploads/${u.replace(/^\/+/, '')}`;
  return `${ASSET_ORIGIN}${path}`;
};

// ✅ 0/1, "0"/"1", true/false 모두 대응
const toBool = (v: any) => {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  return !!v;
};

// ✅ Activity는 hidden이 아니라 is_hidden으로 내려오는 경우가 많음 → 둘 다 읽기
const getHidden = (a: any) =>
  toBool(
    a.hidden ??
    a.is_hidden ??
    a.isHidden ??
    a.is_hide ??
    a.isHide
  );

const getEmphasized = (a: any) =>
  toBool(
    a.emphasized ??
    a.is_emphasized ??
    a.isEmphasized ??
    a.highlighted ??
    a.emphasis
  );

// ✅ 응답 정규화: hidden/emphasized는 항상 boolean으로 맞춰 저장
const normalizeActivity = (a: any): Activity => ({
  ...a,
  hidden: getHidden(a),
  emphasized: getEmphasized(a),
});

const normalizeDetail = (row: any): ActivityDetail => ({
  ...row,
  hidden: getHidden(row),
  emphasized: getEmphasized(row),
});

// 단일 파일 업로드 → 서버 URL(절대경로) 반환
const uploadInlineImage = async (file: File) => {
  const compressed = await convertToWebP(file, { 
    maxWidth: 1000, 
    quality: 0.8, 
    prefer: 'image/webp' 
  });
  
  const fd = new FormData();
  
  // ✅ 파일 이름 강제 지정 (.webp로 확장자 변경)
  const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";

  // compressed가 성공했으면 깎아낸 파일과 새 이름을, 아니면 원본을 보냄
  if (compressed) {
    fd.append('image', compressed, newName); 
  } else {
    fd.append('image', file);
  }

  const { data } = await axios.post('/api/admin/upload', fd, { withCredentials: true });
  return fixUploadUrl(data.url);
};

// 툴바 '이미지' 버튼 → 파일 고르고 업로드 → 에디터에 <img> 삽입
function imageToolbarHandler(this: any) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = await uploadInlineImage(file);
    const quill = this.quill;
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', url, 'user');
    quill.setSelection(range.index + 1);
  };
  input.click();
}

// ReactQuill 모듈
const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image', 'clean'],
    ],
    handlers: {
      image: imageToolbarHandler,
    },
  },
};

const ActivityList: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const [formLang, setFormLang] = useState<"ko" | "ja">("ko");
  const quillKoRef = useRef<any>(null);
  const quillJaRef = useRef<any>(null);

  const [form, setForm] = useState<ActivityForm>({
    id: null,
    title: '',
    title_ja: '',
    content: '',
    content_ja: '',
    emphasized: false,
    hidden: false,
    imageFile: null,
    thumbnailFile: null,
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [preview, setPreview] = useState({ image: '', thumbnail: '' });

  // ✅ 목록 불러오기: 캐시 방지 + 정규화
  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<any[]>('/api/admin/activities', {
        withCredentials: true,
        params: { _ts: Date.now() },         // ✅ 캐시 깨기 (WorkList에는 없어도, Activity만 캐시될 수 있음)
        headers: { "Cache-Control": "no-cache" },
      });

      const normalized = (response.data ?? []).map(normalizeActivity);
      setActivities(normalized);

      // ✅ 혹시 필드 확인 필요하면 이 로그로 실제 키를 봐도 됨
      // console.log("[ADMIN][activities sample]", response.data?.[0]);
    } catch (err: any) {
      console.error(err);
      setError('활동 불러오기 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 단건 편집 로드
  const handleEdit = async (id: number) => {
    const { data } = await axios.get<any>(`/api/admin/activities/${id}`, { withCredentials: true });
    const row = normalizeDetail(data);

    setForm({
      id: row.id,
      title: row.title ?? '',
      title_ja: row.title_ja ?? '',
      content: row.content ?? '',
      content_ja: row.content_ja ?? '',
      emphasized: !!row.emphasized,
      hidden: !!row.hidden,
      imageFile: null,
      thumbnailFile: null,
    });

    setPreview({
      image: fixUploadUrl(row.image_url) || '',
      thumbnail: fixUploadUrl(row.thumbnail_url) || '',
    });

    setIsEditing(true);
    setFormLang('ko');
  };

  const insertImageAtSelection = (quill: any, url: string) => {
    let range = quill.getSelection(true);
    if (!range) {
      quill.focus();
      range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
    }
    quill.insertEmbed(range.index, 'image', url, 'user');
    quill.setSelection(range.index + 1);
  };

  const isLikelyImageUrl = (u: string) =>
    /^data:image\//i.test(u) ||
    /^https?:\/\//i.test(u) && /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(u);

  const attachDnDPasteHandlers = (quill: any) => {
    if (!quill) return;
    const root: HTMLElement = quill.root;

    const insertFiles = async (files: FileList | File[]) => {
      for (const f of Array.from(files)) {
        if (!f.type?.startsWith?.('image/')) continue;
        const url = await uploadInlineImage(f);
        insertImageAtSelection(quill, url);
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const dt = e.dataTransfer;
      if (!dt) return;

      if (dt.files && dt.files.length > 0) {
        await insertFiles(dt.files);
        return;
      }

      const uri = dt.getData('text/uri-list') || dt.getData('text/plain');
      const url = uri?.split('\n')[0]?.trim();
      if (url && isLikelyImageUrl(url)) {
        insertImageAtSelection(quill, url);
      }
    };

    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      const imageItems = items ? Array.from(items).filter(it => it.kind === 'file' && it.type.startsWith('image/')) : [];
      if (imageItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        for (const it of imageItems) {
          const file = it.getAsFile();
          if (file) {
            const url = await uploadInlineImage(file);
            insertImageAtSelection(quill, url);
          }
        }
        return;
      }

      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text && isLikelyImageUrl(text)) {
        e.preventDefault();
        e.stopPropagation();
        insertImageAtSelection(quill, text);
      }
    };

    root.addEventListener('dragover', onDragOver);
    root.addEventListener('drop', onDrop);
    root.addEventListener('paste', onPaste);

    return () => {
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('drop', onDrop);
      root.removeEventListener('paste', onPaste);
    };
  };

  useEffect(() => {
    const blockNav = (e: DragEvent) => {
      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      const isFileDrop = types.includes('Files');
      if (!isFileDrop) return;

      const t = e.target as HTMLElement | null;
      const tag = (t?.closest('input,textarea,select,button,label') as HTMLElement | null)?.tagName;
      if (tag) return;

      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', blockNav);
    window.addEventListener('drop', blockNav);
    return () => {
      window.removeEventListener('dragover', blockNav);
      window.removeEventListener('drop', blockNav);
    };
  }, []);

  useEffect(() => { fetchActivities(); }, []);

  useEffect(() => {
    const instance = (formLang === 'ja' ? quillJaRef.current : quillKoRef.current);

    let cleanup: (() => void) | undefined;

    const bind = () => {
      const quill = instance?.getEditor?.();
      if (!quill) return false;
      cleanup = attachDnDPasteHandlers(quill);
      return true;
    };

    if (!bind()) {
      const id = requestAnimationFrame(() => { bind(); });
      return () => {
        cancelAnimationFrame(id);
        cleanup?.();
      };
    }

    return () => cleanup?.();
  }, [formLang]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleContentChange = (value: string) => {
    if (formLang === 'ko') setForm(prev => ({ ...prev, content: value }));
    else setForm(prev => ({ ...prev, content_ja: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const compressed = await convertToWebP(raw, { maxWidth: 1600, quality: 0.82, prefer: 'image/webp' });
    setForm(prev => ({ ...prev, imageFile: compressed }));
    setPreview(p => ({ ...p, image: URL.createObjectURL(raw) }));
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const compressed = await convertToWebP(raw, { maxWidth: 600, quality: 0.8, prefer: 'image/webp' });
    setForm(prev => ({ ...prev, thumbnailFile: compressed }));
    setPreview(p => ({ ...p, thumbnail: URL.createObjectURL(raw) }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      title: '',
      title_ja: '',
      content: '',
      content_ja: '',
      emphasized: false,
      hidden: false,
      imageFile: null,
      thumbnailFile: null,
    });
    setPreview({ image: '', thumbnail: '' });
    setIsEditing(false);
    setFormLang('ko');
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('title_ja', form.title_ja);
    formData.append('content', form.content);
    formData.append('content_ja', form.content_ja);
    formData.append('emphasized', String(form.emphasized));
    if (form.imageFile) formData.append('image', form.imageFile);
    if (form.thumbnailFile) formData.append('thumbnail', form.thumbnailFile);

    try {
      if (isEditing && form.id) {
        await axios.patch(`/api/admin/activities/${form.id}`, formData, { withCredentials: true });
      } else {
        await axios.post('/api/admin/activities', formData, { withCredentials: true });
      }
      resetForm();
      fetchActivities();
    } catch (err: any) {
      console.error(err);
      alert('저장 중 오류 발생');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/admin/activities/${id}`, { withCredentials: true });
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('삭제 중 오류 발생');
    }
  };

  // ✅ 숨김 토글: 서버가 hidden / is_hidden 중 뭘 받아도 되게 둘 다 전송
  const toggleHidden = async (id: number, currentHidden: boolean) => {
    const nextHidden = !currentHidden;
    try {
      await axios.patch(
        `/api/admin/activities/${id}/hide`,
        { hidden: nextHidden, is_hidden: nextHidden ? 1 : 0 },
        { withCredentials: true }
      );

      // WorkList처럼 즉시 UI 반영
      setActivities(prev =>
        prev.map(a => a.id === id ? normalizeActivity({ ...a, hidden: nextHidden, is_hidden: nextHidden ? 1 : 0 }) : a)
      );
    } catch (err: any) {
      console.error(err);
      alert('표시 상태 변경 중 오류 발생');
    }
  };

  const toggleEmphasized = async (id: number, currentEmph: boolean) => {
    const next = !currentEmph;
    try {
      await axios.patch(`/api/admin/activities/${id}`, { emphasized: next }, { withCredentials: true });
      setActivities(prev =>
        prev.map(a => a.id === id ? normalizeActivity({ ...a, emphasized: next }) : a)
      );
    } catch (err: any) {
      console.error(err);
      alert('강조 상태 변경 중 오류 발생');
    }
  };

  const deleteFile = async (target: FileTarget) => {
    if (!form.id) return;
    if (!confirm(target === 'image' ? '이미지를 삭제할까요?' : '썸네일을 삭제할까요?')) return;

    await axios.delete(`/api/admin/activities/${form.id}/file`, {
      params: { target },
      withCredentials: true,
    });

    if (target === 'image') {
      setPreview(p => ({ ...p, image: '' }));
      setForm(prev => ({ ...prev, imageFile: null }));
    } else {
      setPreview(p => ({ ...p, thumbnail: '' }));
      setForm(prev => ({ ...prev, thumbnailFile: null }));
    }

    setActivities(prev =>
      prev.map(a =>
        a.id === form.id
          ? { ...a, ...(target === 'image' ? { image_url: '' } : { thumbnail_url: '' }) }
          : a
      )
    );
  };

  const imgWrap: React.CSSProperties = { position: 'relative', display: 'inline-block' };
  const xBtn: React.CSSProperties = {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: '50%',
    border: 'none', outline: 'none',
    background: 'rgba(220,38,38,0.95)',
    color: '#fff', fontSize: 14, lineHeight: '22px', fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
    opacity: .9,
  };

  const LABELS = {
    addNew: { ko: "새 활동 추가", ja: "新しい活動を追加" },
    edit: { ko: "활동 수정", ja: "活動を編集" },
    titleKo: { ko: "제목 (한국어)", ja: "タイトル (韓国語)" },
    titleJa: { ko: "제목 (일본어)", ja: "タイトル (日本語)" },
    contentKo: { ko: "내용 (한국어)", ja: "内容 (韓国語)" },
    contentJa: { ko: "내용 (일본어)", ja: "内容 (日本語)" },
    emphasize: { ko: "강조하기 (위쪽 노출)", ja: "強調する (上部に表示)" },
    image: { ko: "이미지", ja: "画像" },
    thumbnail: { ko: "썸네일", ja: "サムネイル" },
    save: { ko: "저장", ja: "保存" },
    cancel: { ko: "취소", ja: "キャンセル" },
    nonelist: { ko:"등록된 활동이 없습니다.", ja: "登録されたアクティビティがありません。" },
    list: { ko:"활동 목록", ja: "活動目録" },
    update: { ko: "수정", ja: "編集" },
    emphasizeBtn: { ko: "강조", ja: "強調" },
    deEmphasizeBtn: { ko: "강조해제", ja: "強調解除" },
    hide: { ko: "숨기기", ja: "非表示" },
    show: { ko: "노출", ja: "表示" },
    delete: { ko: "삭제", ja: "削除" },
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="p-4">
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-2xl font-semibold mb-2">
          {isEditing ? LABELS.edit[language] : LABELS.addNew[language]}
        </h2>

        {/* 언어 토글 + 썸네일 */}
        <div className="mb-4 p-4 border rounded">
          <button
            onClick={() => setFormLang('ko')}
            className={`px-4 py-2 rounded ${formLang === 'ko' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            한국어
          </button>
          <button
            onClick={() => setFormLang('ja')}
            className={`px-4 py-2 rounded ${formLang === 'ja' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            日本語
          </button>

          <label className="block mb-1">{LABELS.thumbnail[language]}</label>
          {preview.thumbnail && (
            <div style={imgWrap} className="mb-2">
              <img
                src={preview.thumbnail}
                alt={LABELS.thumbnail[language]}
                className="w-32 h-32 object-cover rounded"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <button
                type="button"
                title="썸네일 삭제"
                aria-label="썸네일 삭제"
                style={xBtn}
                onClick={(e) => { e.stopPropagation(); deleteFile('thumbnail'); }}
              >
                ×
              </button>
            </div>
          )}
          <input type="file" accept="image/*" name="thumbnailFile" onChange={handleThumbnailChange} />
        </div>

        {/* 입력 폼 */}
        <div className="mb-6 border p-4 rounded">
          <div className="mb-2">
            <div className={formLang === 'ko' ? 'block' : 'hidden'}>
              <input
                key="title-ko"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                placeholder={LABELS.titleKo[language]}
                className="w-full p-2 border rounded mb-2"
              />
            </div>
            <div className={formLang === 'ja' ? 'block' : 'hidden'}>
              <input
                key="title-ja"
                name="title_ja"
                value={form.title_ja}
                onChange={handleInputChange}
                placeholder={LABELS.titleJa[language]}
                className="w-full p-2 border rounded mb-2"
              />
            </div>
          </div>

          <div className="mb-2">
            <div className={formLang === 'ko' ? 'block' : 'hidden'}>
              <label className="block mb-1">{LABELS.contentKo[language]}</label>
              <ReactQuill
                key="quill-ko"
                ref={quillKoRef}
                value={form.content}
                onChange={handleContentChange}
                modules={quillModules}
                className="mb-2"
              />
            </div>
            <div className={formLang === 'ja' ? 'block' : 'hidden'}>
              <label className="block mb-1">{LABELS.contentJa[language]}</label>
              <ReactQuill
                key="quill-ja"
                ref={quillJaRef}
                value={form.content_ja}
                onChange={handleContentChange}
                modules={quillModules}
                className="mb-2"
              />
            </div>
          </div>

          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              name="emphasized"
              checked={form.emphasized}
              onChange={handleInputChange}
              id="emphasized"
              className="mr-2"
            />
            <label htmlFor="emphasized">{LABELS.emphasize[language]}</label>
          </div>

          <label className="block mb-1">{LABELS.image[language]}</label>
          {preview.image && (
            <div style={imgWrap} className="mb-2">
              <img
                src={preview.image}
                alt="이미지"
                style={{ maxWidth: 240 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <button
                type="button"
                title="이미지 삭제"
                aria-label="이미지 삭제"
                style={xBtn}
                onClick={(e) => { e.stopPropagation(); deleteFile('image'); }}
              >
                ×
              </button>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleImageChange} className="mb-2" />
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        >
          {LABELS.save[language]}
        </button>

        {isEditing && (
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            {LABELS.cancel[language]}
          </button>
        )}
      </div>

      {/* 목록 */}
      <h2 className="text-xl font-semibold mb-4">{LABELS.list[language]}</h2>
      {activities.length === 0 ? (
        <p>{LABELS.nonelist[language]}</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((act) => {
            const isHidden = getHidden(act);          // ✅ 여기로 통일
            const isEmph = getEmphasized(act);

            return (
              <li
                key={act.id}
                className={`flex justify-between items-center border p-2 rounded ${isHidden ? 'opacity-50' : ''}`}
              >
                <div className="w-full">
                  <p className="font-medium">{act.title || <span className="text-red-500">번역되지 않음</span>}</p>
                  <p className="font-medium">{act.title_ja || <span className="text-red-500">未翻訳</span>}</p>
                  <p className="text-sm text-gray-500">{new Date(act.created_at).toLocaleString()}</p>
                </div>

                <div className="flex flex-row space-x-2">
                  <button
                    onClick={() => handleEdit(act.id)}
                    className="px-3 py-1 border border-gray-300 rounded bg-white text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                  >
                    {LABELS.update[language]}
                  </button>

                  <button
                    onClick={() => toggleEmphasized(act.id, isEmph)}
                    className="px-3 py-1 border border-gray-300 rounded bg-white text-green-600 hover:bg-green-50 whitespace-nowrap"
                  >
                    {isEmph ? LABELS.deEmphasizeBtn[language] : LABELS.emphasizeBtn[language]}
                  </button>

                  <button
                    onClick={() => toggleHidden(act.id, isHidden)}
                    className="px-3 py-1 border border-gray-300 rounded bg-white text-yellow-600 hover:bg-yellow-50 whitespace-nowrap"
                  >
                    {isHidden ? LABELS.show[language] : LABELS.hide[language]}
                  </button>

                  <button
                    onClick={() => handleDelete(act.id)}
                    className="px-3 py-1 border border-gray-300 rounded bg-white text-red-600 hover:bg-red-50 whitespace-nowrap"
                  >
                    {LABELS.delete[language]}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ActivityList;
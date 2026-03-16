import React, { useEffect, useRef, useState, type ChangeEvent } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { convertToWebP } from './utils/image';
import { useLanguage } from "../../contexts/LanguageContext";

type FileTarget = 'image' | 'thumbnail';

interface Work {
  id: number;
  title: string;
  title_ja: string;
  content: string;
  content_ja: string;
  created_at: string;
  emphasized: boolean;
  hidden: number | boolean;
  image_url?: string;
  thumbnail_url?: string;
}

interface WorkForm {
  id: number | null; 
  title: string;
  title_ja: string;
  content: string;
  content_ja: string;
  emphasized: boolean;
  hidden: number | boolean;
  imageFile: File | null;
  thumbnailFile: File | null;
}

interface WorkDetail {
  id: number;
  title: string | null;
  title_ja: string | null;
  content: string | null;
  content_ja: string | null;
  emphasized: number | boolean;
  hidden: number | boolean;
  image_url: string | null;
  thumbnail_url: string | null;
}

const ASSET_ORIGIN =
  import.meta.env.VITE_UPLOAD_ORIGIN || window.location.origin; // .env로 강제 가능

const fixUploadUrl = (u?: string | null): string => {
  if (!u) return '';
  if (/^https?:\/\//.test(u)) return u;
  const path = u.startsWith('/uploads/') ? u : `/uploads/${u.replace(/^\/+/, '')}`;
  return `${ASSET_ORIGIN}${path}`;
};
// 단일 파일 업로드 → 서버가 돌려준 URL을 절대경로로 보정해 반환
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

// 툴바 '이미지' 버튼 클릭 → 파일 고르고 업로드 → 에디터에 <img> 삽입
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
// ReactQuill 모듈 (툴바 + 커스텀 이미지 핸들러)
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

const WorkList: React.FC = () => {
  const [work, setWork] = useState<Work[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const [formLang, setFormLang] = useState<"ko" | "ja">("ko");
  const quillKoRef = useRef<any>(null);
  const quillJaRef = useRef<any>(null);

  const [form, setForm] = useState<WorkForm>({
    id: null,                 // ← 추가
    title: '',
    title_ja: '',
    content: '',
    content_ja: '',
    emphasized: false,
    hidden: false,            // ← 추가(폼에서 관리하려면)
    imageFile: null,
    thumbnailFile: null,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [preview, setPreview] = useState({
    image: '',        // 기존 image_url 또는 선택한 파일의 objectURL
    thumbnail: '',    // 기존 thumbnail_url 또는 선택한 파일의 objectURL
  });

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await axios.get<Work[]>('/api/admin/work', { withCredentials: true });
      setWork(response.data as Work[]);
    } catch (err: any) {
      console.error(err);
      setError('활동 불러오기 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 편집 시작 시(단건 조회 결과 row 사용)
  const handleEdit = async (id: number) => {
    const { data: row } = await axios.get<WorkDetail>(`/api/admin/work/${id}`, { withCredentials: true });
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
    // quill.getSelection(true)가 null일 수 있어서 폴백 처리
    let range = quill.getSelection(true);
    if (!range) {
      quill.focus();
      range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
    }
    quill.insertEmbed(range.index, 'image', url, 'user');
    quill.setSelection(range.index + 1);
  };

  // 웹 이미지 URL로 보이는지 판별
  const isLikelyImageUrl = (u: string) =>
    /^data:image\//i.test(u) ||
    /^https?:\/\//i.test(u) && /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(u);
  // drop/paste로 들어온 이미지들 업로드 → 본문에 삽입
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

    // 1) 파일 드롭
    if (dt.files && dt.files.length > 0) {
      await insertFiles(dt.files);
      return;
    }

    // 2) 웹 이미지 URL 드롭 (다른 페이지에서 끌어옴)
    const uri = dt.getData('text/uri-list') || dt.getData('text/plain');
    const url = uri?.split('\n')[0]?.trim();
    if (url && isLikelyImageUrl(url)) {
      insertImageAtSelection(quill, url);
    }
  };

  const onPaste = async (e: ClipboardEvent) => {
    // 1) 클립보드에 이미지 파일이 있으면 업로드
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

    // 2) 텍스트로 이미지 URL이 들어온 경우
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
  useEffect(() => { fetchActivities(); }, []);
  useEffect(() => {
    const instance = (formLang === 'ja' ? quillJaRef.current : quillKoRef.current);

    // ReactQuill이 아직 ref를 못 건 경우가 있어 한 번 더 시도
    let cleanup: (() => void) | undefined;

    const bind = () => {
      const quill = instance?.getEditor?.();
      if (!quill) return false;
      cleanup = attachDnDPasteHandlers(quill); // ← 여기가 실제 바인딩
      return true;
    };

    // 즉시 한 번 시도하고,
    if (!bind()) {
      // 렌더 직후 한 프레임 뒤에 다시 시도 (마운트 타이밍 보완)
      const id = requestAnimationFrame(() => { bind(); });
      return () => {
        cancelAnimationFrame(id);
        cleanup?.();
      };
    }

    // 정상 바인딩 시 cleanup 반환
    return () => cleanup?.();
  }, [formLang]);
  // 페이지 전역의 파일 드롭 → 새 탭 열리는 기본 동작 차단
  useEffect(() => {
    const blockNav = (e: DragEvent) => {
      // 파일 드롭일 때만 막고, 입력 컨트롤 위 드롭은 통과
      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      const isFileDrop = types.includes('Files');
      if (!isFileDrop) return;

      const t = e.target as HTMLElement | null;
      const tag = (t?.closest('input,textarea,select,button,label') as HTMLElement | null)?.tagName;
      if (tag) return; // 폼 컨트롤 위 드롭은 허용

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

  useEffect(() => {
  const q = (formLang === 'ja' ? quillJaRef.current : quillKoRef.current)?.getEditor?.();
  if (!q) return;
  const detach = attachDnDPasteHandlers(q); // 내부에서 dragover/drop/paste addEventListener
  return detach; // cleanup (StrictMode 중복 방지)
}, [formLang]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
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
    if (raw) setPreview(p => ({ ...p, image: URL.createObjectURL(raw) }));
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const compressed = await convertToWebP(raw, { maxWidth: 600, quality: 0.8, prefer: 'image/webp' });
    setForm(prev => ({ ...prev, thumbnailFile: compressed }));
    if (raw) setPreview(p => ({ ...p, thumbnail: URL.createObjectURL(raw) }));
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
    // 프리뷰 상태를 쓰는 경우
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
        await axios.patch(`/api/admin/work/${form.id}`, formData, { withCredentials: true });
      } else {
        await axios.post('/api/admin/work', formData, { withCredentials: true });
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
      await axios.delete(`/api/admin/work/${id}`, { withCredentials: true });
      setWork(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('삭제 중 오류 발생');
    }
  };

  const toggleHidden = async (id: number, hidden: boolean) => {
    try {
      await axios.patch(`/api/admin/work/${id}/hide`, { hidden: !hidden }, { withCredentials: true });
      setWork(prev => prev.map(a => a.id === id ? { ...a, hidden: !hidden } : a));
    } catch (err: any) {
      console.error(err);
      alert('표시 상태 변경 중 오류 발생');
    }
  };

  const toggleEmphasized = async (id: number, emphasized: boolean) => {
    try {
      await axios.patch(`/api/admin/work/${id}`, { emphasized: !emphasized }, { withCredentials: true });
      setWork(prev => prev.map(a => a.id === id ? { ...a, emphasized: !emphasized } : a));
    } catch (err: any) {
      console.error(err);
      alert('강조 상태 변경 중 오류 발생');
    }
  };

  //이미지 제거
  const deleteFile = async (target: FileTarget) => {
    if (!form.id) return;
    if (!confirm(target === 'image' ? '이미지를 삭제할까요?' : '썸네일을 삭제할까요?')) return;
    await axios.delete(`/api/admin/work/${form.id}/file`, {
      params: { target },
      withCredentials: true,
    });

    // 프리뷰/폼 상태 갱신
    if (target === 'image') {
      setPreview(p => ({ ...p, image: '' }));
      setForm(prev => ({ ...prev, imageFile: null }));
    } else {
      setPreview(p => ({ ...p, thumbnail: '' }));
      setForm(prev => ({ ...prev, thumbnailFile: null }));
    }

    // 목록 캐시도 반영
    setWork(prev =>
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
    background: 'rgba(220,38,38,0.95)', /* 빨강 */
    color: '#fff', fontSize: 14, lineHeight: '22px', fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
    opacity: .9,
  };
  const LABELS = {
    addNew: { ko: "새 작품 추가", ja: "新しい作品を追加" },
    edit: { ko: "작품 수정", ja: "作品編集" },
    titleKo: { ko: "제목 (한국어)", ja: "タイトル (韓国語)" },
    titleJa: { ko: "제목 (일본어)", ja: "タイトル (日本語)" },
    contentKo: { ko: "내용 (한국어)", ja: "内容 (韓国語)" },
    contentJa: { ko: "내용 (일본어)", ja: "内容 (日本語)" },
    emphasize: { ko: "강조하기 (위쪽 노출)", ja: "強調する (上部に表示)" },
    image: { ko: "이미지", ja: "画像" },
    thumbnail: { ko: "썸네일", ja: "サムネイル" },
    save: { ko: "저장", ja: "保存" },
    cancel: { ko: "취소", ja: "キャンセル" },
    nonelist: {ko:"등록된 작품이 없습니다.", ja: "登録された作品がありません。"},
    // 목록용 버튼들
    list: { ko:"작품 목록", ja: "作品目録"},
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
      {/* 언어 토글 */}
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
        <input
          type="file"
          accept="image/*"
          name="thumbnailFile"
          onChange={handleThumbnailChange}
        />
      </div>

      {/* 입력 폼 */}
      <div className="mb-6 border p-4 rounded">
        <div className="mb-2">
          {/* 한국어 제목 */}
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
          {/* 일본어 제목 */}
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
          {/* 한국어 에디터 */}
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
          {/* 일본어 에디터 */}
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

      {/* 활동 목록 */}
      <h2 className="text-xl font-semibold mb-4">{LABELS.list[language]}</h2>
      {work.length === 0 ? (
        <p>{LABELS.nonelist[language]}</p>
      ) : (
        <ul className="space-y-2">
          {work.map((act) => (
            <li
              key={act.id}
              className={`flex justify-between items-center border p-2 rounded ${
                act.hidden ? 'opacity-50' : ''
              }`}
            >
              <div className="w-full">
                <p className="font-medium">{act.title || <span className="text-red-500">번역되지 않음</span>}</p>
                <p className="font-medium">{act.title_ja || <span className="text-red-500">未翻訳</span>}</p>
                <p className="text-sm text-gray-500">{new Date(act.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-row space-x-2">
                <button onClick={() => handleEdit(act.id)} 
                  className="px-3 py-1 border border-gray-300 rounded bg-white text-blue-600 hover:bg-blue-50 whitespace-nowrap">
                    {LABELS.update[language]}
                </button>
                <button onClick={() => toggleEmphasized(act.id, act.emphasized)} 
                  className="px-3 py-1 border border-gray-300 rounded bg-white text-green-600 hover:bg-green-50 whitespace-nowrap">
                  {act.emphasized ? LABELS.deEmphasizeBtn[language] : LABELS.emphasizeBtn[language]}
                </button>
                <button onClick={() => toggleHidden(act.id, !!act.hidden)} 
                  className="px-3 py-1 border border-gray-300 rounded bg-white text-yellow-600 hover:bg-yellow-50 whitespace-nowrap">
                  {act.hidden ? LABELS.show[language] : LABELS.hide[language]}
                </button>
                <button onClick={() => handleDelete(act.id)} 
                  className="px-3 py-1 border border-gray-300 rounded bg-white text-red-600 hover:bg-red-50 whitespace-nowrap">
                  {LABELS.delete[language]}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WorkList;

// src/components/BoardForm.tsx
import { useMemo, useState } from "react";
import axios from "axios";
import TagSelector from "./TagSelector";
import { useLanguage } from "../contexts/LanguageContext";

type Board = {
  id?: number;
  title_ko: string;
  title_ja: string;
  body_ko: string;
  body_ja: string;
  is_hidden?: 0 | 1 | boolean;
  tag_names?: string | null;
};

type Props = {
  mode: "create" | "edit";
  board?: Board;
  onSaved: (id: number) => void;
};

export default function BoardForm({ mode, board, onSaved }: Props) {
  const { language: uiLang } = useLanguage();

  const initial = useMemo(
    () => ({
      title_ko: board?.title_ko || "",
      title_ja: board?.title_ja || "",
      body_ko: board?.body_ko || "",
      body_ja: board?.body_ja || "",
      is_hidden: !!board?.is_hidden,
      tag_names: board?.tag_names || "",
    }),
    [board]
  );

  const [form, setForm] = useState({
    title_ko: initial.title_ko,
    title_ja: initial.title_ja,
    body_ko: initial.body_ko,
    body_ja: initial.body_ja,
    is_hidden: initial.is_hidden,
    tags: (initial.tag_names || "").split(",").filter(Boolean),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 다국어 번역 사전
  const L = useMemo(
    () => ({
      titleKo: uiLang === "ko" ? "제목 (한국어)" : "タイトル (韓国語)",
      titleJa: uiLang === "ko" ? "제목 (일본어)" : "タイトル (日本語)",
      bodyKo: uiLang === "ko" ? "내용 (한국어)" : "内容 (韓国語)",
      bodyJa: uiLang === "ko" ? "내용 (일본어)" : "内容 (日本語)",
      hidden: uiLang === "ko" ? "비공개 글로 설정 (숨기기)" : "非公開に設定 (非表示)",
      submit: uiLang === "ko" ? (mode === "create" ? "게시물 등록" : "수정 내용 저장") : mode === "create" ? "投稿を登録" : "変更を保存",
      needTitle: uiLang === "ko" ? "한국어와 일본어 제목을 모두 입력해주세요." : "韓/日のタイトルを両方入力してください。",
      needBody: uiLang === "ko" ? "한국어와 일본어 내용을 모두 입력해주세요." : "韓/日の内容を両方入力してください。",
      placeholderTitle: uiLang === "ko" ? "제목을 입력하세요" : "タイトルを入力してください",
      placeholderBody: uiLang === "ko" ? "내용을 작성해주세요..." : "内容を入力してください...",
    }),
    [uiLang, mode]
  );

  const validate = () => {
    if (!form.title_ko.trim() || !form.title_ja.trim()) {
      setError(L.needTitle);
      return false;
    }
    if (!form.body_ko.trim() || !form.body_ja.trim()) {
      setError(L.needBody);
      return false;
    }
    setError(null);
    return true;
  };

  const save = async () => {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title_ko: form.title_ko,
        title_ja: form.title_ja,
        body_ko: form.body_ko,
        body_ja: form.body_ja,
        is_hidden: form.is_hidden ? 1 : 0,
        tags: form.tags,
      } as const;

      if (mode === "create") {
        const { data } = await axios.post<{ id: number }>("/api/boards", payload);
        onSaved(data.id);
      } else {
        if (!board?.id) throw new Error("board id is missing");
        await axios.put(`/api/boards/${board.id}`, payload);
        onSaved(board.id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // 공통 입력창 스타일
  const inputClass = "w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white text-gray-900";
  const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";

  return (
    <div className="w-full space-y-6">
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 font-medium">
          🚨 {error}
        </div>
      )}

      {/* 제목 영역 (PC에서는 반반, 모바일에서는 위아래) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>{L.titleKo}</label>
          <input
            className={inputClass}
            placeholder={L.placeholderTitle}
            value={form.title_ko}
            onChange={(e) => setForm({ ...form, title_ko: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>{L.titleJa}</label>
          <input
            className={inputClass}
            placeholder={L.placeholderTitle}
            value={form.title_ja}
            onChange={(e) => setForm({ ...form, title_ja: e.target.value })}
          />
        </div>
      </div>

      {/* 본문 영역 */}
      <div>
        <label className={labelClass}>{L.bodyKo}</label>
        <textarea
          className={`${inputClass} h-40 resize-y`}
          placeholder={L.placeholderBody}
          value={form.body_ko}
          onChange={(e) => setForm({ ...form, body_ko: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass}>{L.bodyJa}</label>
        <textarea
          className={`${inputClass} h-40 resize-y`}
          placeholder={L.placeholderBody}
          value={form.body_ja}
          onChange={(e) => setForm({ ...form, body_ja: e.target.value })}
        />
      </div>

      {/* 설정 영역 (비공개, 태그) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-800 mb-2">태그 (タグ)</label>
          <TagSelector value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
        </div>
        
        <div className="md:border-l md:border-gray-300 md:pl-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              checked={!!form.is_hidden}
              onChange={(e) => setForm({ ...form, is_hidden: e.target.checked })}
            />
            {L.hidden}
          </label>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="pt-4 flex justify-end">
        <button
          disabled={saving}
          onClick={save}
          className={`px-8 py-3 rounded-lg font-bold text-white shadow-sm transition-all ${
            saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5"
          }`}
        >
          {saving ? "..." : L.submit}
        </button>
      </div>
    </div>
  );
}



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
  tag_names?: string | null; // "a,b,c"
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

  const L = useMemo(
    () => ({
      titleKo: uiLang === "ko" ? "제목(한국어)" : "タイトル(韓国語)",
      titleJa: uiLang === "ko" ? "タイトル(日本語)" : "タイトル(日本語)",
      bodyKo: uiLang === "ko" ? "내용(한국어)" : "内容(韓国語)",
      bodyJa: uiLang === "ko" ? "内容(日本語)" : "内容(日本語)",
      hidden: uiLang === "ko" ? "숨기기" : "非表示",
      submit:
        uiLang === "ko" ? (mode === "create" ? "등록" : "저장") : mode === "create" ? "登録" : "保存",
      needTitle:
        uiLang === "ko" ? "제목(한/일)을 입력해주세요." : "韓/日のタイトルを入力してください。",
      needBody:
        uiLang === "ko" ? "내용(한/일)을 입력해주세요." : "韓/日の内容を入力してください。",
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
        // ✅ 코드/언어 필드는 완전히 제거했습니다 (다목적 게시판용)
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

  return (
    <div className="max-w-2xl space-y-3">
      {error && (
        <div className="p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <input
        className="w-full border px-3 py-2 rounded"
        placeholder={L.titleKo}
        value={form.title_ko}
        onChange={(e) => setForm({ ...form, title_ko: e.target.value })}
      />
      <input
        className="w-full border px-3 py-2 rounded"
        placeholder={L.titleJa}
        value={form.title_ja}
        onChange={(e) => setForm({ ...form, title_ja: e.target.value })}
      />

      <textarea
        className="w-full border px-3 py-2 rounded h-28"
        placeholder={L.bodyKo}
        value={form.body_ko}
        onChange={(e) => setForm({ ...form, body_ko: e.target.value })}
      />
      <textarea
        className="w-full border px-3 py-2 rounded h-28"
        placeholder={L.bodyJa}
        value={form.body_ja}
        onChange={(e) => setForm({ ...form, body_ja: e.target.value })}
      />

      {/* ✅ 코드/언어 입력 섹션을 완전히 삭제했습니다 */}

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={!!form.is_hidden}
            onChange={(e) => setForm({ ...form, is_hidden: e.target.checked })}
          />
          {L.hidden}
        </label>
        <TagSelector value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
      </div>

      <div className="flex gap-2">
        <button
          disabled={saving}
          onClick={save}
          className={`px-4 py-2 rounded text-white ${
            saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {L.submit}
        </button>
      </div>
    </div>
  );
}

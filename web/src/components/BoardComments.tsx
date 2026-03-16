// src/components/BoardComments.tsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

type CommentItem = {
  id: number;
  board_id: number;
  user_id: number | null;
  guest_name: string | null;
  body: string;
  created_at: string;
  user_nickname?: string | null;
};

export default function BoardComments({ boardId }: { boardId: number }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAdmin = user?.is_admin === 1;

  // 다국어 번역 사전
  const L = useMemo(
    () => ({
      title: language === "ko" ? "댓글" : "コメント",
      name: language === "ko" ? "이름 (선택)" : "名前 (任意)",
      password: language === "ko" ? "삭제용 비밀번호" : "削除用パスワード",
      write: language === "ko" ? "등록" : "投稿",
      del: language === "ko" ? "삭제" : "削除",
      confirmDel: language === "ko" ? "정말 삭제하시겠습니까?" : "本当に削除しますか？",
      needText: language === "ko" ? "내용을 입력해주세요." : "内容を入力してください。",
      wrongPw: language === "ko" ? "비밀번호가 일치하지 않습니다." : "パスワードが一致しません。",
      loading: language === "ko" ? "댓글을 불러오는 중..." : "コメントを読み込み中...",
      placeholder: language === "ko" ? "댓글을 남겨보세요." : "コメントを残す...",
      guestLabel: language === "ko" ? "게스트" : "ゲスト",
      empty: language === "ko" ? "첫 번째 댓글을 남겨보세요!" : "最初のコメントを残してみましょう！",
      deleteFailed: language === "ko" ? "삭제에 실패했습니다." : "削除に失敗しました。",
    }),
    [language]
  );

  const [items, setItems] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPw, setGuestPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<CommentItem[]>(`/api/comments/${boardId}`);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const add = async () => {
    if (!text.trim()) {
      alert(L.needText);
      return;
    }
    setPosting(true);
    try {
      await axios.post(`/api/comments/${boardId}`, {
        body: text,
        guest_name: user ? null : guestName,
        guest_password: user ? null : guestPw,
      });
      setText("");
      setGuestPw("");
      await load();
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: number, isGuestComment: boolean) => {
    if (!confirm(L.confirmDel)) return;
    try {
      const payload: any = {};
      if (!user && isGuestComment) {
        const pw = prompt(L.password) || "";
        if (!pw) return; // 비밀번호 입력을 취소한 경우
        payload.guest_password = pw;
      }
      await axios.delete(`/api/comments/${id}`, { data: payload });
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message;
      if (msg?.toLowerCase().includes("권한") || msg?.toLowerCase().includes("password") || e?.response?.status === 403) {
        alert(L.wrongPw);
      } else {
        alert(msg || L.deleteFailed);
      }
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const inputClass = "border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full";

  return (
    <section className="w-full">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        💬 {L.title} <span className="text-blue-600 text-lg">({items.length})</span>
      </h3>

      {/* 댓글 목록 */}
      <div className="mb-8">
        {loading ? (
          <div className="text-center py-6 text-gray-500 font-medium animate-pulse">{L.loading}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50">
            {L.empty}
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((c) => {
              const isGuest = !c.user_id;
              const canDelete =
                (user && (isAdmin || Number(user.id) === Number(c.user_id))) ||
                (isGuest && !user); 

              return (
                <li key={c.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isGuest ? "text-gray-600" : "text-blue-700"}`}>
                        {c.user_id ? c.user_nickname || `user#${c.user_id}` : c.guest_name || L.guestLabel}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{formatDate(c.created_at)}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => remove(c.id, isGuest)}
                        className="text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors"
                      >
                        {L.del}
                      </button>
                    )}
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {c.body}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 댓글 작성 영역 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        {!user && (
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <input
              className={inputClass}
              placeholder={L.name}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <input
              type="password"
              className={inputClass}
              placeholder={L.password}
              value={guestPw}
              onChange={(e) => setGuestPw(e.target.value)}
            />
          </div>
        )}
        <div className="relative">
          <textarea
            className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-24 text-sm"
            placeholder={L.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <button
              disabled={posting}
              onClick={add}
              className={`px-6 py-2 rounded-lg font-bold text-white transition-all ${
                posting ? "bg-gray-400 cursor-not-allowed" : "bg-gray-800 hover:bg-black hover:shadow-md"
              }`}
            >
              {L.write}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
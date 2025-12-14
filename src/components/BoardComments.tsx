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

  const L = useMemo(
    () => ({
      title: language === "ko" ? "댓글" : "コメント",
      name: language === "ko" ? "이름(선택)" : "名前(任意)",
      password: language === "ko" ? "삭제용 비밀번호" : "削除用パスワード",
      write: language === "ko" ? "등록" : "投稿",
      del: language === "ko" ? "삭제" : "削除",
      confirmDel: language === "ko" ? "삭제할까요?" : "削除しますか？",
      needText: language === "ko" ? "내용을 입력해주세요." : "内容を入力してください。",
      wrongPw: language === "ko" ? "비밀번호가 일치하지 않습니다." : "パスワードが一致しません。",
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
        payload.guest_password = pw;
      }
      await axios.delete(`/api/comments/${id}`, { data: payload });
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message;
      if (msg?.toLowerCase().includes("권한") || msg?.toLowerCase().includes("password")) {
        alert(L.wrongPw);
      } else {
        alert(msg || "Delete failed");
      }
    }
  };

  return (
    <section className="mt-10">
      <h2 className="font-bold mb-2">{L.title}</h2>

      {/* 목록 */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => {
            const isGuest = !c.user_id;
            // 로그인 사용자는 본인/관리자만 삭제 가능, 비로그인은 비번으로 본인만
            const canDelete =
              (user && (isAdmin || Number(user.id) === Number(c.user_id))) ||
              (isGuest && !user); // 게스트 본인 여부는 서버에서 비번으로 확인

            return (
              <li key={c.id} className="border rounded p-3">
                <div className="text-sm text-gray-500 mb-1">
                  {c.user_id
                    ? c.user_nickname || `user#${c.user_id}`
                    : c.guest_name || "게스트"}
                </div>
                <div className="whitespace-pre-wrap">{c.body}</div>
                {canDelete && (
                  <button
                    onClick={() => remove(c.id, isGuest)}
                    className="mt-2 text-red-600"
                  >
                    {L.del}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 작성 */}
      <div className="mt-4 border-t pt-4 space-y-2">
        {!user && (
          <div className="flex gap-2">
            <input
              className="border px-2 py-1 rounded"
              placeholder={L.name}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <input
              type="password"
              className="border px-2 py-1 rounded"
              placeholder={L.password}
              value={guestPw}
              onChange={(e) => setGuestPw(e.target.value)}
            />
          </div>
        )}
        <textarea
          className="w-full border px-3 py-2 rounded h-24"
          placeholder="Comment"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          disabled={posting}
          onClick={add}
          className={`px-4 py-2 rounded text-white ${
            posting ? "bg-gray-400" : "bg-gray-800 hover:bg-black"
          }`}
        >
          {L.write}
        </button>
      </div>
    </section>
  );
}

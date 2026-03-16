// src/pages/LoginPage.tsx  (또는 src/pages/Login.tsx)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type User } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { http } from "../api/http";

export default function LoginPage() {
  const { language } = useLanguage();
  const t = (ko: string, ja: string) => (language === "ko" ? ko : ja);

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();

  // 서버가 한국어 메시지를 줄 경우 일부만 일본어로 매핑(원하면 더 추가 가능)
  const translateServerMsg = (msg?: string) => {
    if (!msg) return msg;
    if (language === "ko") return msg;

    const map: Record<string, string> = {
      "아이디 또는 비밀번호가 올바르지 않습니다.": "IDまたはパスワードが正しくありません。",
      "권한이 없습니다.": "権限がありません。",
      "로그인이 필요합니다.": "ログインが必要です。",
    };
    return map[msg] ?? msg; // 모르는 메시지는 그대로 표시
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await http<{
        user?: User;
        needInit?: boolean;
        id?: string;
        message?: string;
      }>("/login", {
        method: "POST",
        body: JSON.stringify({ id, password }),
      });

      if (data.message) {
        alert(translateServerMsg(data.message));

        if (data.needInit) {
          localStorage.setItem(
            "user",
            JSON.stringify({ userId: data.id, nickname: data.id })
          );
          setUser({ id: data.id!, nickname: data.id!, is_admin: 0 } as any);
          navigate("/init");
        }
        return;
      }

      if (!data.user) {
        alert(t("로그인된 사용자 정보가 없습니다.", "ログインユーザー情報がありません。"));
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      let errMsg = t("서버 연결 실패", "サーバー接続に失敗しました。");
      
      try {
        // 서버가 JSON 형태({ message: "..." })로 에러를 보냈을 경우
        const parsed = JSON.parse(err.message);
        if (parsed.message) errMsg = parsed.message;
      } catch {
        // JSON이 아니라 일반 텍스트로 보냈을 경우
        if (err.message) errMsg = err.message;
      }

      // 번역기 돌려서 알림 띄우기
      alert(translateServerMsg(errMsg));
    }
  };

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md rounded-lg p-8 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          {t("로그인", "ログイン")}
        </h2>

        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-id">
          {t("아이디", "ID")}
        </label>
        <input
          id="login-id"
          name="id"
          type="text"
          inputMode="url"          /* 💡 모바일에서 영문 자판이 먼저 뜨도록 유도 */
          autoCapitalize="none"    /* 스마트폰 첫 글자 자동 대문자 방지 */
          autoCorrect="off"        /* 자동 완성 끄기 */
          style={{ imeMode: "disabled" }} /* 구형 브라우저용 영문 고정 (IE 등) */
          placeholder={t("아이디", "ID")}
          value={id}
          onChange={(e) => {
            // 💡 한글이나 공백이 입력되면 즉시 지워버려서 영문/숫자 입력을 강제함
            const onlyEngNum = e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣\s]/g, "");
            setId(onlyEngNum);
          }}
          className="w-full mb-4 px-4 py-2 border rounded"
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-password">
          {t("비밀번호", "パスワード")}
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          placeholder={t("비밀번호", "パスワード")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-2 border rounded"
          required
          autoComplete="current-password"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {t("로그인", "ログイン")}
        </button>
      </form>
    </div>
  );
}
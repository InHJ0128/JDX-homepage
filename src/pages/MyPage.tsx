import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

export default function MyPage() {
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const parsed = JSON.parse(userStr);
      setUser(parsed);
      setNickname(parsed.nickname || "");
    }
  }, []);

  const handleNicknameChange = async () => {
    const res = await fetch("/api/user/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", 
      body: JSON.stringify({ id: user.id, nickname }),
    });
    if (res.ok) {
      alert(language === "ko" ? "닉네임이 변경되었습니다.":"ニックネームが変更されました。");
      const updated = { ...user, nickname };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
    }
  };

  const handlePasswordChange = async () => {
    if (password !== passwordConfirm) {
      alert(language === "ko" ? "비밀번호가 일치하지 않습니다.":"パスワードが一致しません。");
      return;
    }
    const res = await fetch('/api/user/password', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", 
      body: JSON.stringify({ id: user.id, password }),
    });
    if (res.ok) {
      alert(language === "ko" ? "비밀번호가 변경되었습니다. 다시 로그인해 주세요.":"パスワードが変更されました。 もう一度ログインしてください。");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
      navigate("/login");
    } else {
      alert(language === "ko" ? "비밀번호 변경 실패":"パスワード変更失敗");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">{language === "ko" ? "내 정보 수정":"情報修正"}</h2>

      <label className="block mb-2 font-medium">{language === "ko" ? "닉네임":"ニックネーム"}</label>
      <input
        className="w-full border p-2 rounded mb-4"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white w-full py-2 rounded mb-6 hover:bg-blue-700"
        onClick={handleNicknameChange}
      >
        {language === "ko" ? "닉네임 변경":"ニックネーム変更"}
      </button>

      <label className="block mb-2 font-medium">{language === "ko" ? "새 비밀번호":"新しいパスワード"}</label>
      <input
        className="w-full border p-2 rounded mb-2"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <label className="block mb-2 font-medium">{language === "ko" ? "비밀번호 확인":"パスワード確認"}</label>
      <input
        className="w-full border p-2 rounded mb-4"
        type="password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
      />

      <button
        className="bg-red-600 text-white w-full py-2 rounded hover:bg-red-700"
        onClick={handlePasswordChange}
      >
        {language === "ko" ? "비밀번호 변경":"パスワード変更"}
      </button>
    </div>
  );
}

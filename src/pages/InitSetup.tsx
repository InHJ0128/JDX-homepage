// src/pages/InitSetup.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { http } from "../api/http";

// 초기 설정에 필요한 정보 타입
type InitInfo = {
  userId: string;
  nickname: string;
  password: string;
  confirmPassword: string;
  // 추가 필드 필요 시 여기에 정의
};

export default function InitSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState<InitInfo>({ userId: "", nickname: "", password: "", confirmPassword: "",  });
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();


  // localStorage에서 userId, nickname 로드
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/login");
      return;
    }
    try {
      const parsed = JSON.parse(stored) as InitInfo;
      setForm(parsed);
    } catch (err) {
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      alert(language === "ko" ? 
        "비밀번호와 비밀번호 확인이 일치하지 않습니다.":
      "パスワードとパスワードの確認が一致しません。");
      return;
    }
    setLoading(true);
    console.log(form);
    try {
      console.log("유저정보",user);
      const originalUserId = user?.id;
      if (!originalUserId) {
        alert(language === "ko" ? "사용자 정보가 없습니다. 다시 로그인해 주세요.":
          "ユーザー情報がありません。 もう一度ログインしてください。"
        );
        navigate("/login");
        return;
      }
      const payload = {
        originalUserId, 
        userId: form.userId,
        nickname: form.nickname,
        password: form.password,
      };
      console.log("[InitSetup] submitting form:", payload);
      console.log(JSON.stringify(payload));
      await http<{ success: boolean }>("/user/init", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // 초기 설정 완료 후
      alert(language === "ko" ?"초기 설정이 완료되었습니다. 다시 로그인해 주세요.":
        "初期設定が完了しました。 もう一度ログインしてください。"
      );
      // 클라이언트 세션·상태 초기화
      localStorage.removeItem("user");
      setUser(null);
      // 로그인 페이지로 이동
      navigate("/login");
    } catch (err: any) {
      console.error("초기 설정 실패", err);
      alert(language === "ko" ?"초기 설정 중 오류가 발생했습니다.":
        "初期設定中にエラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">{language === "ko" ?"초기 설정":"初期設定"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">{language === "ko" ?"사용자 ID":"ユーザーID"}</label>
          <input
            type="text"
            name="userId"
            value={form.userId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <p className="text-red-500 text-sm mt-1">
          {language === "ko" ?"ID는 최초 한번만 변경 가능합니다.":"IDは最初の一度だけ変更可能です。"}
        </p>
        <div>
          <label className="block mb-1">{language === "ko" ?"닉네임":"ニックネーム"}</label>
          <input
            type="text"
            name="nickname"
            value={form.nickname}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block mb-1">{language === "ko" ?"비밀번호":"パスワード"}</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block mb-1">{language === "ko" ?"비밀번호 확인":"パスワード確認"}</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        {/* 추가 입력 필드 여기에 삽입 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {loading ? language === "ko" ? "저장 중..." :"保存中···" : language === "ko" ? "저장 및 완료":"保存および完了"}
        </button>
      </form>
    </div>
  );
}

// src/pages/InitSetup.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { http } from "../api/http";

type InitInfo = {
  userId: string;
  nickname: string;
  password: string;
  confirmPassword: string;
};

export default function InitSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState<InitInfo>({ userId: "", nickname: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/login");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      // 서버에서 임시로 발급해준 userId(학번)와 nickname(이름)을 폼에 채워넣습니다.
      setForm({
        userId: parsed.userId || parsed.id || "",
        nickname: parsed.nickname || "",
        password: "",
        confirmPassword: ""
      });
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

    try {
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
        userId: form.userId, // 학번 그대로 서버에 전송
        nickname: form.nickname,
        password: form.password,
      };
      
      await http<{ success: boolean }>("/user/init", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      alert(language === "ko" ?"초기 설정이 완료되었습니다. 다시 로그인해 주세요.":
        "初期設定が完了しました。 もう一度ログインしてください。"
      );
      
      localStorage.removeItem("user");
      setUser(null);
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

  const inputCls = "w-full p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block mb-1 text-sm font-medium text-gray-700";

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white shadow-md border border-gray-100 rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {language === "ko" ? "초기 설정" : "初期設定"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>{language === "ko" ? "아이디 (학번)" : "ID (学籍番号)"}</label>
            <input
              type="text"
              name="userId"
              value={form.userId}
              className={`${inputCls} bg-gray-100 text-gray-500 cursor-not-allowed`}
              readOnly
              disabled
            />
            <p className="text-blue-600 text-xs mt-1.5 font-medium">
              {language === "ko" ? "* 아이디는 학번으로 고정되어 변경할 수 없습니다." : "* IDは学籍番号に固定されており、変更できません。"}
            </p>
          </div>

          <div>
            <label className={labelCls}>{language === "ko" ? "활동 닉네임" : "ニックネーム"}</label>
            <input
              type="text"
              name="nickname"
              value={form.nickname}
              onChange={handleChange}
              className={inputCls}
              placeholder={language === "ko" ? "동아리에서 사용할 닉네임을 입력하세요" : "サークルで使用するニックネーム"}
              required
            />
          </div>

          <div>
            <label className={labelCls}>{language === "ko" ? "새 비밀번호" : "新しいパスワード"}</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={inputCls}
              placeholder={language === "ko" ? "새로운 비밀번호를 입력하세요" : "新しいパスワード"}
              required
            />
          </div>

          <div>
            <label className={labelCls}>{language === "ko" ? "비밀번호 확인" : "パスワード確認"}</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className={inputCls}
              placeholder={language === "ko" ? "비밀번호를 다시 입력하세요" : "もう一度入力してください"}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2.5 mt-2 rounded hover:bg-blue-700 transition"
          >
            {loading 
              ? (language === "ko" ? "저장 중..." : "保存中...") 
              : (language === "ko" ? "저장 및 완료" : "保存および完了")}
          </button>
        </form>
      </div>
    </div>
  );
}
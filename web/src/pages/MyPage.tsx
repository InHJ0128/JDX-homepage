import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext"; 
import Navbar from "../components/Navbar"; 

export default function MyPage() {
  const [localUser, setLocalUser] = useState<any>(null);
  
  // ✅ 확장된 유저 정보 State
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { language } = useLanguage();
  // ✅ setUser를 여기서 꼭 가져와야 합니다!
  const { user, setUser } = useAuth(); 

  const t = (ko: string, ja: string) => (language === "ko" ? ko : ja);

  // ✅ 1. 유저 정보 불러오기
  const fetchUserInfo = async () => {
    let targetId = user?.id;
    if (!targetId) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        targetId = JSON.parse(storedUser).id;
      }
    }

    if (!targetId) return;

    try {
      const res = await fetch(`/api/user/me?id=${targetId}`, { credentials: "include" });
      
      if (res.ok) {
        const data = await res.json();
        setLocalUser(data);
        setNickname(data.nickname || "");
        setName(data.name || "");
        setDepartment(data.department || "");
        setGrade(data.grade !== null ? String(data.grade) : "");
        setPhone(data.phone || "");
      } else if (res.status === 404) {
        localStorage.removeItem("user");
        navigate("/login");
      }
    } catch (err) {
      console.error("유저 정보 로드 실패", err);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [user?.id]);

  // ✅ 2. 전체 정보 저장 (500 에러 방지 처리)
  const handleProfileSave = async () => {
    const targetId = user?.id || localUser?.id;
    if (!targetId) {
      alert(t("로그인이 필요합니다.", "ログインが必要です。"));
      return;
    }

    setLoading(true);
    try {
      // 💡 핵심: DB가 INT 형이므로 빈칸은 null로, 아니면 숫자로 변환
      const parsedGrade = grade === "" ? null : Number(grade);

      const res = await fetch("/api/user/info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include", 
        body: JSON.stringify({ 
          id: targetId, 
          nickname: nickname.trim(), 
          name: name.trim(), 
          department: department.trim(), 
          grade: parsedGrade, 
          phone: phone.trim() 
        }),
      });

      if (res.ok) {
        alert(t("정보가 성공적으로 저장되었습니다.", "情報가 저장되었습니다."));
        const updated = { ...localUser, ...user, nickname, name, department, grade: parsedGrade, phone };
        localStorage.setItem("user", JSON.stringify(updated));
        if (setUser) setUser(updated); 
      } else {
        const errorData = await res.json();
        alert(t("저장 실패: ", "保存失敗: ") + (errorData.message || "Error"));
      }
    } catch (err) {
      console.error(err);
      alert(t("서버 연결 실패", "サーバー接続失敗"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ 3. 비밀번호 변경 (400 에러 방지 - id 포함)
  const handlePasswordChange = async () => {
    const targetId = user?.id || localUser?.id;
    if (!targetId) {
      alert(t("로그인이 필요합니다.", "ログインが必要です。"));
      return;
    }

    if (!password || password !== passwordConfirm) {
      alert(t("비밀번호가 일치하지 않습니다.", "パスワードが一致しません。"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/password', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", 
        body: JSON.stringify({ id: targetId, password }), 
      });

      if (res.ok) {
        alert(t("비밀번호가 변경되었습니다. 다시 로그인해 주세요.", "パスワードが変更されました。"));
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("storage"));
        navigate("/login");
      } else {
        const errorData = await res.json();
        alert(t("변경 실패: ", "変更失敗: ") + (errorData.message || "Error"));
      }
    } catch (err) {
      alert(t("서버 연결 실패", "サーバー接続失敗"));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-gray-300 p-2.5 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block mb-1 text-sm font-medium text-gray-700";

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar isLoggedIn={!!user} isAdmin={!!user?.is_admin} />
      </div>
      
      <div className="flex justify-center items-center min-h-[100vh] pt-24 pb-10">
        <div className="bg-white shadow-md border border-gray-100 rounded-xl p-8 w-full max-w-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {t("내 정보 수정", "情報修正")}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>{t("이름", "氏名")}</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>{t("학번 (아이디)", "学籍番号 (ID)")}</label>
              <input className={`${inputCls} bg-gray-100 text-gray-500`} value={localUser?.student_id || localUser?.id || ""} readOnly disabled />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>{t("학과", "学科")}</label>
              <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>{t("학년", "学年")}</label>
              <input className={inputCls} type="number" value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{t("전화번호", "電話番号")}</label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{t("활동 닉네임", "ニックネーム")}</label>
              <input className={inputCls} value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
          </div>

          <button
            className="bg-blue-600 text-white font-bold w-full py-2.5 rounded mb-8 mt-2 hover:bg-blue-700 transition"
            onClick={handleProfileSave}
            disabled={loading}
          >
            {loading ? t("저장 중...", "保存中...") : t("개인정보 저장", "情報保存")}
          </button>

          <hr className="mb-8 border-gray-200" />

          <label className={labelCls}>{t("새 비밀번호", "新しいパスワード")}</label>
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <label className={labelCls}>{t("비밀번호 확인", "パスワード確認")}</label>
          <input className={inputCls} type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />

          <button
            className="bg-red-600 text-white font-bold w-full py-2.5 rounded hover:bg-red-700 transition"
            onClick={handlePasswordChange}
            disabled={loading}
          >
            {loading ? t("변경 중...", "変更中...") : t("비밀번호 변경", "パスワード変更")}
          </button>
        </div>
      </div>
    </>
  );
}
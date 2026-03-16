import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../../components/mobile/MobileLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function MobileMyPage() {
  const { user, setUser } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [localUser, setLocalUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const t = (ko: string, ja: string) => (language === "ko" ? ko : ja);

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
        window.location.href = "/m/login";
      }
    } catch (err) {
      console.error("유저 정보 로드 실패", err);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [user?.id]);

  const handleProfileSave = async () => {
    const targetId = user?.id || localUser?.id;
    if (!targetId) {
      alert(t("로그인이 필요합니다.", "ログインが必要です。"));
      navigate("/m/login");
      return;
    }

    setLoading(true);
    try {
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
        alert(t("정보가 성공적으로 저장되었습니다.", "情報が保存されました。"));
        const updated = { ...localUser, ...user, nickname, name, department, grade: parsedGrade, phone };
        localStorage.setItem("user", JSON.stringify(updated));
        if (setUser) setUser(updated);
      } else {
        const errorData = await res.json();
        alert(t("저장 실패", "保存失敗") + `: ${errorData.message}`);
      }
    } catch (e) {
      alert(t("서버 연결 실패", "接続失敗"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    const targetId = user?.id || localUser?.id;
    if (!targetId) return;

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
        alert(t("비밀번호 변경 완료. 다시 로그인해 주세요.", "パスワード変更完了。"));
        localStorage.removeItem("user");
        setUser(null);
        navigate("/m/login");
      } else {
        const errorData = await res.json();
        alert(t("변경 실패", "失敗") + `: ${errorData.message}`);
      }
    } catch (e) {
      alert(t("서버 연결 실패", "接続失敗"));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const labelCls = "block text-xs font-bold text-gray-700 mb-1.5 ml-1";

  return (
    <MobileLayout title={t("개인설정", "個人設定")}>
      {!user ? (
        <div className="p-4 flex flex-col items-center justify-center h-[50vh]">
          <button className="w-full bg-black text-white py-3 rounded-lg" onClick={() => navigate("/m/login")}>
            {t("로그인", "ログイン")}
          </button>
        </div>
      ) : (
        <div className="p-4 pb-10 space-y-6">
          <div className="bg-gray-50 rounded-xl border p-5 shadow-sm">
            <h3 className="font-extrabold text-lg mb-4">{t("내 정보 수정", "情報修正")}</h3>
            
            <label className={labelCls}>{t("학번 (아이디)", "学籍番号")}</label>
            <input className={`${inputCls} bg-gray-200 text-gray-500`} value={localUser?.student_id || localUser?.id || ""} readOnly disabled />

            <label className={labelCls}>{t("이름", "氏名")}</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />

            <label className={labelCls}>{t("전공", "専攻")}</label>
            <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />

            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>{t("학년", "学年")}</label>
                <input className={inputCls} type="number" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </div>
              <div className="flex-[2]">
                <label className={labelCls}>{t("닉네임", "ニックネーム")}</label>
                <input className={inputCls} value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </div>
            </div>

            <label className={labelCls}>{t("전화번호", "電話番号")}</label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />

            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg" onClick={handleProfileSave} disabled={loading}>
              {loading ? t("저장 중...", "保存中...") : t("정보 저장하기", "保存")}
            </button>
          </div>

          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="font-extrabold text-lg mb-4 text-red-600">{t("비밀번호 변경", "パスワード変更")}</h3>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("새 비밀번호", "新パスワード")} />
            <input className={inputCls} type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder={t("비밀번호 확인", "確認")} />
            <button className="w-full bg-red-600 text-white font-bold py-3 rounded-lg" onClick={handlePasswordChange} disabled={loading}>
              {t("변경하기", "変更")}
            </button>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
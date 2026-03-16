// src/pages/Apply.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { http } from "../api/http";

type LangKey = "java" | "python" | "web" | "other";

export default function Apply() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const labels = useMemo(() => {
    const ko = {
      title: "동아리 지원하기",
      desc: "아래 정보를 입력하고 제출해 주세요.",
      studentId: "학번",
      name: "이름",
      grade: "학년",
      dept: "학과",
      phone: "전화번호",
      exp: "프로그래밍 경험",
      want: "배우고 싶은 분야/언어",
      other: "기타 (직접 입력)",
      submit: "지원서 제출",
      cancel: "취소",
      required: "* 표시는 필수입니다.",
      gradePlaceholder: "학년 선택",
      expPlaceholder: "예) Python으로 간단한 크롤링 해봄 / 웹 프로젝트 경험 등",
      ok: "지원서가 제출되었습니다!",
      needLang: "배우고 싶은 언어/분야를 최소 1개 선택해 주세요.",
      fail: "제출 실패: 잠시 후 다시 시도해 주세요.",
    };
    const ja = {
      title: "応募フォーム",
      desc: "以下の情報を入力して送信してください。",
      studentId: "学籍番号",
      name: "氏名",
      grade: "学年",
      dept: "学科",
      phone: "電話番号",
      exp: "プログラミング経験",
      want: "学びたい分野/言語",
      other: "その他（自由入力）",
      submit: "送信",
      cancel: "キャンセル",
      required: "* は必須です。",
      gradePlaceholder: "学年を選択",
      expPlaceholder: "例) Pythonで簡単な制作 / Webプロジェクト経験など",
      ok: "送信が完了しました！",
      needLang: "学びたい分野/言語を1つ以上選択してください。",
      fail: "送信に失敗しました。しばらくしてから再試行してください。",
    };
    return language === "ko" ? ko : ja;
  }, [language]);

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<number | "">("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [wanted, setWanted] = useState<Record<LangKey, boolean>>({
    java: false,
    python: false,
    web: false,
    other: false,
  });
  const [otherText, setOtherText] = useState("");

  const inputCls =
    "w-full px-4 py-2 border-2 border-gray-400 rounded-lg bg-white shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelCls = "block mb-2 font-semibold text-gray-800";
  const helpCls = "text-xs text-gray-500 mt-1";
  const cardCls = "bg-white shadow-md rounded-xl p-6";

  const toggleWanted = (key: LangKey) => {
    setWanted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selected = (Object.keys(wanted) as LangKey[]).filter((k) => wanted[k]);
    if (selected.length === 0) {
      alert(labels.needLang);
      return;
    }

    const desiredLanguages = selected
      .map((k) => (k === "other" ? `other:${otherText.trim()}` : k))
      .join(",");

    try {
        // desiredLanguages 예: "python,other:1234"
        const raw = (desiredLanguages || "").split(",").map(s => s.trim()).filter(Boolean);

        // ["python", "other"]
        const langs = raw.map(x => x.split(":")[0]).filter(Boolean);

        // "1234"
        const other = raw.find(x => x.startsWith("other:"))?.slice("other:".length) ?? "";

        // 서버가 기대하는 snake_case로 전송
        await http("/applications", {
        method: "POST",
        body: JSON.stringify({
            student_id: studentId.trim(),
            name: name.trim(),
            grade: Number(grade),
            department: department.trim(),
            phone: phone.trim(),
            experience: experience.trim(),
            desired_languages: langs,      // ✅ 배열
            desired_other: other.trim(),   // ✅ 기타 내용
        }),
        });

      alert(labels.ok);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert(labels.fail);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-2">{labels.title}</h2>
      <p className="text-gray-600 mb-6">{labels.desc}</p>
      <p className="text-sm text-gray-500 mb-6">{labels.required}</p>

      <form onSubmit={handleSubmit} className={cardCls}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>
              {labels.studentId} <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelCls}>
              {labels.name} <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelCls}>
              {labels.grade} <span className="text-red-500">*</span>
            </label>
            <select
              className={inputCls}
              value={grade}
              onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}
              required
            >
              <option value="">{labels.gradePlaceholder}</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5+</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>
              {labels.dept} <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>
              {labels.phone} <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>{labels.exp}</label>
            <textarea
              className={inputCls}
              style={{ minHeight: 120 }}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder={labels.expPlaceholder}
            />
            <div className={helpCls}>* 경험이 없어도 괜찮아요. 솔직하게 적어주면 돼요.</div>
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>
              {labels.want} <span className="text-red-500">*</span>
            </label>

            <div className="flex flex-wrap gap-3">
              <Chip checked={wanted.java} onClick={() => toggleWanted("java")} label={language === "ko" ? "자바" : "Java"} />
              <Chip checked={wanted.python} onClick={() => toggleWanted("python")} label={language === "ko" ? "파이썬" : "Python"} />
              <Chip checked={wanted.web} onClick={() => toggleWanted("web")} label={language === "ko" ? "웹" : "Web"} />
              <Chip checked={wanted.other} onClick={() => toggleWanted("other")} label={language === "ko" ? "기타" : "Other"} />
            </div>

            {wanted.other && (
              <div className="mt-3">
                <label className={labelCls}>{labels.other}</label>
                <input
                  className={inputCls}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder={language === "ko" ? "예) C++, Kotlin, Unity 등" : "例) C++, Kotlin, Unity など"}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {labels.submit}
          </button>
        </div>
      </form>
    </div>
  );
}

function Chip({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-4 py-2 rounded-full border-2 text-sm font-semibold transition " +
        (checked ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
      }
    >
      {label}
    </button>
  );
}

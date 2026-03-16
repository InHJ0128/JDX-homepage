import { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";
import { useLanguage } from "../../contexts/LanguageContext";

type AppRow = {
  id: number;
  student_id: string;
  name: string;
  grade: string | number;
  department: string;
  phone: string;
  experience: string | null;
  desired_languages: string; // "java,python,other"
  desired_other: string | null;
  status: "new" | "reviewing" | "accepted" | "rejected";
  is_read: 0 | 1;
  created_at: string;
};

const statusText = (s: AppRow["status"], ko: boolean) => {
  const map = {
    new: ko ? "신규" : "新規",
    reviewing: ko ? "검토중" : "確認中",
    accepted: ko ? "합격" : "合格",
    rejected: ko ? "불합격" : "不合格",
  };
  return map[s];
};

const StatusPill = ({ status, ko }: { status: AppRow["status"]; ko: boolean }) => {
  const cls =
    status === "new"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : status === "reviewing"
      ? "bg-yellow-50 text-yellow-800 border-yellow-200"
      : status === "accepted"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      {statusText(status, ko)}
    </span>
  );
};

export default function ApplicationList() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const t = (a: string, b: string) => (ko ? a : b);

  const [rows, setRows] = useState<AppRow[]>([]);
  const [selected, setSelected] = useState<AppRow | null>(null);

  const [filterUnread, setFilterUnread] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [q, setQ] = useState(""); // 검색(학번/이름/학과)

  const load = async () => {
    const params = new URLSearchParams();
    if (filterUnread) params.set("unread", "1");
    if (filterStatus) params.set("status", filterStatus);

    const data = await http<AppRow[]>(`/admin/applications${params.toString() ? `?${params}` : ""}`);
    setRows(data);
  };

  useEffect(() => {
    load();
  }, [filterUnread, filterStatus]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      return (
        String(r.student_id).toLowerCase().includes(qq) ||
        String(r.name).toLowerCase().includes(qq) ||
        String(r.department).toLowerCase().includes(qq)
      );
    });
  }, [rows, q]);

  const openDetail = async (r: AppRow) => {
    setSelected(r);
    if (r.is_read === 0) {
      await http(`/admin/applications/${r.id}/read`, { method: "PATCH", body: JSON.stringify({}) });
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_read: 1 } : x)));
      setSelected((prev) => (prev?.id === r.id ? { ...r, is_read: 1 } : prev));
    }
  };

  const changeStatus = async (id: number, status: AppRow["status"]) => {
    await http(`/admin/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
  };

  const deleteOne = async (id: number) => {
    const ok = window.confirm(t("정말 삭제할까요? (복구 불가)", "本当に削除しますか？（復元不可）"));
    if (!ok) return;

    await http(`/admin/applications/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((x) => x.id !== id));
    setSelected((prev) => (prev?.id === id ? null : prev));
  };

  // ✅ [추가됨] 지원서 정보로 계정 자동 생성
  const createUserFromApp = async (app: AppRow) => {
    // 1. 전화번호에서 숫자만 남기고 싹 걸러낸 뒤, 맨 뒤 4자리 추출 (전화번호가 없거나 짧으면 기본값 1234)
    const phoneDigits = app.phone ? app.phone.replace(/[^0-9]/g, "") : "";
    const defaultPwd = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "1234";

    // 2. 관리자에게 한 번 더 확인받기 (기본값이 전화번호 뒷자리로 세팅됨)
    const initPwd = window.prompt(
      t(
        `생성할 계정의 초기 비밀번호를 입력하세요.\n(아이디: ${app.student_id} / 기본값: 전화번호 뒷자리)`, 
        `初期パスワードを入力してください。`
      ), 
      defaultPwd
    );
    if (!initPwd) return;

    try {
      await http(`/admin/users`, {
        method: "POST",
        body: JSON.stringify({
          id: app.student_id,         
          password: initPwd,          // 여기서 확정된 4자리 번호가 서버로 날아갑니다
          nickname: app.name,         
          name: app.name,
          student_id: app.student_id,
          department: app.department,
          grade: app.grade,
          phone: app.phone
        }),
      });
      
      alert(t("계정이 성공적으로 생성되었습니다!", "アカウントが作成されました！"));
      
      // 성공 시 자동으로 상태를 '합격'으로 변경
      await changeStatus(app.id, "accepted"); 
    } catch (err: any) {
      console.error(err);
      let errMsg = t("계정 생성 실패: 이미 존재하는 학번이거나 서버 오류입니다.", "作成失敗");
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.message) errMsg = parsed.message;
      } catch {}
      alert(errMsg);
    }
  };

  const parsedLang = useMemo(() => {
    if (!selected) return [];
    return (selected.desired_languages || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selected]);

  return (
    <div className="space-y-4">
      {/* 헤더/가이드 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("지원서 목록", "応募一覧")}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {t("표의 [상세] 버튼을 눌러 내용을 확인하고, 지원서 정보로 바로 계정을 생성할 수 있어요.",
               "表の[詳細]で内容を確認し、アカウントを作成できます。")}
          </p>
        </div>
        <button className="border rounded px-3 py-1 hover:bg-gray-50" onClick={load}>
          {t("새로고침", "更新")}
        </button>
      </div>

      {/* 필터/검색 */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filterUnread} onChange={() => setFilterUnread((p) => !p)} />
          {t("안 읽음만", "未読のみ")}
        </label>

        <select
          className="border rounded px-2 py-1 text-sm w-full md:w-44"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">{t("전체 상태", "全て")}</option>
          <option value="new">{statusText("new", ko)}</option>
          <option value="reviewing">{statusText("reviewing", ko)}</option>
          <option value="accepted">{statusText("accepted", ko)}</option>
          <option value="rejected">{statusText("rejected", ko)}</option>
        </select>

        <input
          className="border rounded px-3 py-1 text-sm w-full md:flex-1"
          placeholder={t("검색: 학번/이름/학과", "検索: 学籍番号/氏名/学科")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm table-fixed">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-left">
                <th className="p-2 w-20">{t("읽음", "既読")}</th>
                <th className="p-2 w-120 w-[120px]">{t("상태", "状態")}</th>
                <th className="p-2 w-[170px]">{t("접수일", "日時")}</th>
                <th className="p-2 w-[120px]">{t("학번", "学籍番号")}</th>
                <th className="p-2 w-[120px]">{t("이름", "氏名")}</th>
                <th className="p-2 w-[220px]">{t("학과", "学科")}</th>
                <th className="p-2 w-[180px]">{t("희망", "希望")}</th>
                <th className="p-2 w-[170px]">{t("동작", "操作")}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => {
                const unread = r.is_read === 0;
                const isSel = selected?.id === r.id;

                return (
                  <tr
                    key={r.id}
                    className={`border-t ${unread ? "bg-blue-50/40" : "bg-white"} ${isSel ? "outline outline-2 outline-blue-300" : ""}`}
                  >
                    <td className="p-2">
                      <span className={`inline-flex items-center gap-1 ${unread ? "font-bold text-blue-700" : "text-gray-500"}`}>
                        {unread ? "●" : "✓"} {unread ? t("미확인", "未読") : t("확인", "既読")}
                      </span>
                    </td>

                    <td className="p-2">
                      <StatusPill status={r.status} ko={ko} />
                    </td>

                    <td className="p-2 text-gray-700 whitespace-nowrap">
                      {String(r.created_at).slice(0, 19).replace("T", " ")}
                    </td>

                    <td className="p-2 font-mono">{r.student_id}</td>
                    <td className={`p-2 ${unread ? "font-bold" : "font-medium"}`}>{r.name}</td>
                    <td className="p-2 truncate" title={r.department}>{r.department}</td>
                    <td className="p-2 truncate" title={r.desired_languages}>{r.desired_languages}</td>

                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded border hover:bg-gray-50"
                          onClick={() => openDetail(r)}
                        >
                          {t("상세", "詳細")}
                        </button>
                        <button
                          className="px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => deleteOne(r.id)}
                        >
                          {t("삭제", "削除")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td className="p-5 text-gray-500" colSpan={8}>
                    {t("표시할 지원서가 없습니다.", "表示する応募がありません。")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 패널 */}
      {selected && (
        <div className="border rounded-lg p-4 bg-white shadow-sm mt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">
                {t("지원서 상세", "詳細")} #{selected.id}
              </h3>
              <p className="text-sm text-gray-600">
                {t("상태 변경, 계정 생성, 삭제는 아래에서 가능합니다.", "状態変更、アカウント作成、削除は以下で可能です。")}
              </p>
            </div>

            <div className="flex gap-2">
              {/* ✅ [추가됨] 계정 생성 버튼 */}
              <button 
                className="px-3 py-1 rounded border border-blue-400 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition"
                onClick={() => createUserFromApp(selected)}
              >
                {t("계정 생성", "アカウント作成")}
              </button>

              <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={() => setSelected(null)}>
                {t("닫기", "閉じる")}
              </button>
              <button
                className="px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => deleteOne(selected.id)}
              >
                {t("삭제", "削除")}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm">
            <div><b>{t("학번", "学籍番号")}:</b> {selected.student_id}</div>
            <div><b>{t("이름", "氏名")}:</b> {selected.name}</div>
            <div><b>{t("학년", "学年")}:</b> {selected.grade}</div>
            <div><b>{t("학과", "学科")}:</b> {selected.department}</div>
            <div><b>{t("전화", "電話")}:</b> {selected.phone}</div>

            <div className="flex items-center gap-2">
              <b>{t("상태", "状態")}:</b>
              <select
                className="border rounded px-2 py-1"
                value={selected.status}
                onChange={(e) => changeStatus(selected.id, e.target.value as any)}
              >
                <option value="new">{statusText("new", ko)}</option>
                <option value="reviewing">{statusText("reviewing", ko)}</option>
                <option value="accepted">{statusText("accepted", ko)}</option>
                <option value="rejected">{statusText("rejected", ko)}</option>
              </select>
              <StatusPill status={selected.status} ko={ko} />
            </div>
          </div>

          <div className="mt-4 text-sm">
            <b>{t("희망 언어", "希望言語")}:</b>{" "}
            {parsedLang.join(", ")} {selected.desired_other ? `(${selected.desired_other})` : ""}
          </div>

          <div className="mt-3 text-sm">
            <b>{t("프로그래밍 경험", "経験")}:</b>
            <div className="mt-1 border rounded p-3 bg-gray-50 whitespace-pre-wrap">
              {selected.experience || t("(없음)", "(なし)")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
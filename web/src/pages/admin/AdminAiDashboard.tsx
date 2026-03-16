
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { useLanguage } from "../../contexts/LanguageContext";

type PlatformSummary = {
  available: boolean;
  status: "on" | "error" | "missing_admin_key";
  label: string;
  message?: string | null;
  remainingCreditsUsd?: number | null;
  todayTokens: number;
  monthTokens: number;
  monthCostUsd?: number | null;
  source?: string;
};

type OverviewUser = {
  user_id: number;
  login_id: string;
  nickname: string | null;
  ai_enabled: number;
  ai_daily_token_limit: number;
  ai_monthly_token_limit: number;
  today_used_tokens: number;
  month_used_tokens: number;
  total_used_tokens: number;
  recent_message_at?: string | null;
  effectiveStatus: {
    state: "on" | "admin_off" | "user_off" | "platform_error";
    label: string;
  };
};

type OverviewResponse = {
  settings: {
    ai_enabled: boolean;
    ai_default_model: string;
    ai_default_daily_token_limit: number;
    ai_default_monthly_token_limit: number;
    ai_request_token_limit?: number;
  };
  platform: PlatformSummary;
  users: OverviewUser[];
};

type LogConversation = {
  id: number;
  title: string;
  updated_at?: string;
  created_at?: string;
  last_message_preview?: string | null;
};

type LogMessage = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  total_tokens?: number;
};

type LogFile = {
  id: number;
  original_name: string;
  bytes: number;
  openai_status: string;
  created_at?: string;
};

type LogPayload = {
  user: {
    user_id: number;
    login_id: string;
    nickname?: string | null;
  };
  files: LogFile[];
  conversations: LogConversation[];
  messagesByConversation: Record<string, LogMessage[]>;
};

type ContentPart = {
  type: "text" | "code";
  value: string;
  language?: string;
};

const T = {
  title: { ko: "AI 관리", ja: "AI管理" },
  subtitle: { ko: "AI 사용 상태와 사용자 제한을 관리합니다.", ja: "AI利用状態とユーザー制限を管理します。" },
  platformBalance: { ko: "남은 크레딧($)", ja: "残りクレジット($)" },
  todayTokens: { ko: "오늘 토큰 사용량", ja: "本日のトークン使用量" },
  monthTokens: { ko: "이번 달 토큰 사용량", ja: "今月のトークン使用量" },
  platformStatus: { ko: "현재 사용가능 여부", ja: "現在の利用可否" },
  platformCost: { ko: "이번 달 비용($)", ja: "今月の費用($)" },
  balanceUnavailable: { ko: "공식 API로 잔액을 안정적으로 읽을 수 없어 표시되지 않을 수 있습니다.", ja: "公式APIで残高を安定して取得できないため、表示されない場合があります。" },
  globalControls: { ko: "전체 설정", ja: "全体設定" },
  defaultDaily: { ko: "기본 일 제한", ja: "基本の日制限" },
  defaultMonthly: { ko: "기본 월 제한", ja: "基本の月制限" },
  applyAll: { ko: "전체 사용자 일괄 적용", ja: "全ユーザーに一括適用" },
  globalOn: { ko: "전체 사용 ON", ja: "全体利用ON" },
  globalOff: { ko: "전체 사용 OFF", ja: "全体利用OFF" },
  saveAll: { ko: "전체 설정 저장", ja: "全体設定を保存" },
  users: { ko: "사용자별 설정", ja: "ユーザー別設定" },
  account: { ko: "계정", ja: "アカウント" },
  nickname: { ko: "닉네임", ja: "ニックネーム" },
  currentStatus: { ko: "현재 상태", ja: "現在状態" },
  enabled: { ko: "사용 가능", ja: "利用可否" },
  dailyLimit: { ko: "일 제한", ja: "日制限" },
  monthlyLimit: { ko: "월 제한", ja: "月制限" },
  todayUsed: { ko: "오늘 사용", ja: "本日使用" },
  monthUsed: { ko: "이번 달 사용", ja: "今月使用" },
  totalUsed: { ko: "누적 사용", ja: "累積使用" },
  save: { ko: "저장", ja: "保存" },
  logs: { ko: "로그 확인", ja: "ログ確認" },
  loading: { ko: "불러오는 중...", ja: "読み込み中..." },
  empty: { ko: "데이터가 없습니다.", ja: "データがありません。" },
  on: { ko: "ON", ja: "ON" },
  off: { ko: "OFF", ja: "OFF" },
  adminOff: { ko: "관리자 OFF", ja: "管理者OFF" },
  userOff: { ko: "사용자 OFF", ja: "ユーザーOFF" },
  platformErr: { ko: "플랫폼 오류", ja: "プラットフォームエラー" },
  logViewer: { ko: "사용자 로그 보기", ja: "ユーザーログ表示" },
  uploadedFiles: { ko: "업로드 파일", ja: "アップロードファイル" },
  conversations: { ko: "대화 목록", ja: "会話一覧" },
  noFiles: { ko: "업로드 파일이 없습니다.", ja: "アップロードファイルがありません。" },
  noConversations: { ko: "대화가 없습니다.", ja: "会話がありません。" },
  close: { ko: "닫기", ja: "閉じる" },
  errorLoad: { ko: "AI 관리 정보를 불러오지 못했습니다.", ja: "AI管理情報を読み込めませんでした。" },
  errorSave: { ko: "저장에 실패했습니다.", ja: "保存に失敗しました。" },
  untitled: { ko: "새 대화", ja: "新しい会話" },
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

function formatUsd(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return `$${value.toFixed(2)}`;
}

function parseMessageContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const regex = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) parts.push({ type: "text", value: text });
    }
    parts.push({ type: "code", language: match[1] || undefined, value: (match[2] || "").replace(/^\n+|\n+$/g, "") });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) parts.push({ type: "text", value: text });
  }
  return parts.length ? parts : [{ type: "text", value: content }];
}

function tokenizeCode(code: string): ReactNode[] {
  const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|\/\*[\s\S]*?\*\/|\b(?:const|let|var|function|return|if|else|for|while|class|import|from|export|default|try|catch|finally|throw|public|private|protected|static|new|async|await|def|print|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|ALTER|JOIN|ORDER|GROUP|BY|LIMIT)\b|\b\d+(?:\.\d+)?\b)/gm;
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) out.push(<Fragment key={`p-${lastIndex}`}>{code.slice(lastIndex, match.index)}</Fragment>);
    const value = match[0];
    let className = "text-slate-100";
    if (/^\/\//.test(value) || /^\/\*/.test(value)) className = "text-emerald-300";
    else if (/^["'`]/.test(value)) className = "text-amber-300";
    else if (/^\d/.test(value)) className = "text-sky-300";
    else className = "text-fuchsia-300";
    out.push(<span key={`t-${match.index}`} className={className}>{value}</span>);
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < code.length) out.push(<Fragment key={`tail-${lastIndex}`}>{code.slice(lastIndex)}</Fragment>);
  return out;
}

function MessageContent({ content }: { content: string }) {
  const parts = useMemo(() => parseMessageContent(content), [content]);
  return (
    <div className="text-sm leading-7 text-slate-900">
      {parts.map((part, index) =>
        part.type === "code" ? (
          <div key={`${index}-code`} className="my-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <div className="border-b border-slate-800 bg-slate-900 px-3 py-2 text-xs uppercase text-slate-300">{part.language || "code"}</div>
            <pre className="max-h-[520px] overflow-auto p-4 text-[13px] leading-6 text-slate-100">
              <code>{tokenizeCode(part.value)}</code>
            </pre>
          </div>
        ) : (
          <div key={`${index}-text`} className="whitespace-pre-wrap break-words">{part.value}</div>
        )
      )}
    </div>
  );
}

function statusClass(state: string) {
  if (state === "on") return "bg-emerald-100 text-emerald-700";
  if (state === "admin_off" || state === "user_off") return "bg-slate-200 text-slate-700";
  return "bg-red-100 text-red-700";
}

export default function AdminAiDashboard() {
  const { language } = useLanguage() as { language: "ko" | "ja" };
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string>("");
  const [bulkDaily, setBulkDaily] = useState<number>(30000);
  const [bulkMonthly, setBulkMonthly] = useState<number>(300000);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [applyAll, setApplyAll] = useState(true);
  const [userEdits, setUserEdits] = useState<Record<number, Partial<OverviewUser>>>({});
  const [logViewer, setLogViewer] = useState<LogPayload | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeLogConversationId, setActiveLogConversationId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/admin/ai/overview");
      setOverview(res.data);
      setGlobalEnabled(Boolean(res.data?.settings?.ai_enabled));
      setBulkDaily(Number(res.data?.settings?.ai_default_daily_token_limit || 0));
      setBulkMonthly(Number(res.data?.settings?.ai_default_monthly_token_limit || 0));
      setUserEdits({});
    } catch (err: any) {
      setError(err?.response?.data?.message || T.errorLoad[language]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const users = useMemo(() => overview?.users || [], [overview]);

  const getUserValue = (user: OverviewUser, key: keyof OverviewUser) => {
    return (userEdits[user.user_id]?.[key] as any) ?? user[key];
  };

  const handleUserField = (userId: number, key: keyof OverviewUser, value: string | number | boolean) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value,
      },
    }));
  };

  const saveUser = async (user: OverviewUser) => {
    setSaving(`user-${user.user_id}`);
    setError("");
    try {
      await axios.patch(`/api/admin/ai/users/${user.user_id}`, {
        ai_enabled: Number(Boolean(getUserValue(user, "ai_enabled"))),
        ai_daily_token_limit: Number(getUserValue(user, "ai_daily_token_limit") || 0),
        ai_monthly_token_limit: Number(getUserValue(user, "ai_monthly_token_limit") || 0),
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || T.errorSave[language]);
    } finally {
      setSaving("");
    }
  };

  const saveSettings = async () => {
    setSaving("global");
    setError("");
    try {
      await axios.patch("/api/admin/ai/settings", {
        ai_enabled: globalEnabled ? 1 : 0,
        default_daily_limit: Number(bulkDaily || 0),
        default_monthly_limit: Number(bulkMonthly || 0),
        apply_to_all_users: applyAll,
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || T.errorSave[language]);
    } finally {
      setSaving("");
    }
  };

  const openLogs = async (user: OverviewUser) => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`/api/admin/ai/users/${user.user_id}/logs`);
      setLogViewer(res.data);
      setActiveLogConversationId(res.data?.conversations?.[0]?.id ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message || T.errorLoad[language]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const activeLogConversation = useMemo(
    () => logViewer?.conversations?.find((item) => item.id === activeLogConversationId) || null,
    [logViewer, activeLogConversationId]
  );
  const activeLogMessages = useMemo(
    () => (activeLogConversationId && logViewer?.messagesByConversation?.[String(activeLogConversationId)]) || [],
    [logViewer, activeLogConversationId]
  );

  if (loading) {
    return <div className="rounded-2xl border bg-white p-8 text-gray-500 shadow-sm">{T.loading[language]}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white px-6 py-5 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-600">{T.title[language]}</h2>
        <p className="mt-1 text-sm text-slate-500">{T.subtitle[language]}</p>
        {error ? <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{T.platformBalance[language]}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{overview?.platform.remainingCreditsUsd == null ? "-" : formatUsd(overview?.platform.remainingCreditsUsd)}</div>
          {overview?.platform.remainingCreditsUsd == null ? (
            <div className="mt-2 text-xs leading-5 text-amber-600">{T.balanceUnavailable[language]}</div>
          ) : null}
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{T.todayTokens[language]}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{formatNumber(overview?.platform.todayTokens || 0)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{T.monthTokens[language]}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{formatNumber(overview?.platform.monthTokens || 0)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{T.platformStatus[language]}</div>
          <div className="mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold bg-slate-100 text-slate-800">
            {overview?.settings.ai_enabled
              ? overview?.platform?.status === "on"
                ? T.on[language]
                : T.platformErr[language]
              : T.adminOff[language]}
          </div>
          {overview?.platform?.message ? <div className="mt-2 text-xs text-slate-500">{overview.platform.message}</div> : null}
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{T.platformCost[language]}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{formatUsd(overview?.platform.monthCostUsd)}</div>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 text-lg font-semibold text-slate-900">{T.globalControls[language]}</div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[180px_180px_auto_140px_160px] xl:items-end">
          <label className="block">
            <div className="mb-1 text-sm text-slate-500">{T.defaultDaily[language]}</div>
            <input
              type="number"
              value={bulkDaily}
              onChange={(e) => setBulkDaily(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm text-slate-500">{T.defaultMonthly[language]}</div>
            <input
              type="number"
              value={bulkMonthly}
              onChange={(e) => setBulkMonthly(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
            {T.applyAll[language]}
          </label>
          <button
            type="button"
            onClick={() => setGlobalEnabled((prev) => !prev)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${globalEnabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-500 hover:bg-slate-600"}`}
          >
            {globalEnabled ? T.globalOn[language] : T.globalOff[language]}
          </button>
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving === "global"}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {saving === "global" ? "..." : T.saveAll[language]}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 text-lg font-semibold text-slate-900">{T.users[language]}</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="px-3 py-3">{T.account[language]}</th>
                <th className="px-3 py-3">{T.nickname[language]}</th>
                <th className="px-3 py-3">{T.currentStatus[language]}</th>
                <th className="px-3 py-3">{T.enabled[language]}</th>
                <th className="px-3 py-3">{T.dailyLimit[language]}</th>
                <th className="px-3 py-3">{T.monthlyLimit[language]}</th>
                <th className="px-3 py-3">{T.todayUsed[language]}</th>
                <th className="px-3 py-3">{T.monthUsed[language]}</th>
                <th className="px-3 py-3">{T.totalUsed[language]}</th>
                <th className="px-3 py-3">{T.save[language]}</th>
                <th className="px-3 py-3">{T.logs[language]}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-slate-400">{T.empty[language]}</td>
                </tr>
              ) : users.map((user) => {
                const enabled = Boolean(Number(getUserValue(user, "ai_enabled")));
                return (
                  <tr key={user.user_id} className="border-b align-top">
                    <td className="px-3 py-3 font-medium text-slate-900">{user.login_id}</td>
                    <td className="px-3 py-3">{user.nickname || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(user.effectiveStatus.state)}`}>
                        {user.effectiveStatus.state === "on"
                          ? T.on[language]
                          : user.effectiveStatus.state === "admin_off"
                            ? T.adminOff[language]
                            : user.effectiveStatus.state === "user_off"
                              ? T.userOff[language]
                              : T.platformErr[language]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleUserField(user.user_id, "ai_enabled", enabled ? 0 : 1)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white ${enabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-500 hover:bg-slate-600"}`}
                      >
                        {enabled ? T.on[language] : T.off[language]}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        className="w-32 rounded-xl border px-3 py-2"
                        value={Number(getUserValue(user, "ai_daily_token_limit") || 0)}
                        onChange={(e) => handleUserField(user.user_id, "ai_daily_token_limit", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        className="w-32 rounded-xl border px-3 py-2"
                        value={Number(getUserValue(user, "ai_monthly_token_limit") || 0)}
                        onChange={(e) => handleUserField(user.user_id, "ai_monthly_token_limit", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-3">{formatNumber(user.today_used_tokens)}</td>
                    <td className="px-3 py-3">{formatNumber(user.month_used_tokens)}</td>
                    <td className="px-3 py-3">{formatNumber(user.total_used_tokens)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => saveUser(user)}
                        disabled={saving === `user-${user.user_id}`}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                      >
                        {saving === `user-${user.user_id}` ? "..." : T.save[language]}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openLogs(user)}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {loadingLogs ? "..." : T.logs[language]}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {logViewer ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 lg:p-5">
          <div className="mx-auto flex h-[calc(100dvh-24px)] w-[min(96vw,1720px)] flex-col rounded-3xl bg-white shadow-2xl lg:h-[calc(100dvh-40px)]">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">{T.logViewer[language]}</div>
                <div className="text-sm text-slate-500">{logViewer.user.nickname || logViewer.user.login_id}</div>
              </div>
              <button
                type="button"
                onClick={() => setLogViewer(null)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {T.close[language]}
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_320px] gap-4 p-4 lg:gap-5">
              <aside className="min-h-0 overflow-hidden rounded-2xl border bg-white">
                <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">{T.conversations[language]}</div>
                <div className="min-h-0 h-full overflow-y-auto px-3 py-3 pb-6">
                  {logViewer.conversations.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-slate-400">{T.noConversations[language]}</div>
                  ) : (
                    <div className="space-y-3">
                      {logViewer.conversations.map((conversation) => (
                        <button
                          type="button"
                          key={conversation.id}
                          onClick={() => setActiveLogConversationId(conversation.id)}
                          className={`w-full rounded-2xl border px-3 py-3 text-left ${conversation.id === activeLogConversationId ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
                        >
                          <div className="line-clamp-1 text-sm font-semibold text-slate-900">{conversation.title || T.untitled[language]}</div>
                          <div className="mt-2 line-clamp-2 text-xs text-slate-500">{conversation.last_message_preview || formatDate(conversation.updated_at || conversation.created_at)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <main className="min-h-0 overflow-hidden rounded-2xl border bg-white">
                <div className="border-b px-4 py-3">
                  <div className="text-xs text-slate-500">{T.logViewer[language]}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{activeLogConversation?.title || T.untitled[language]}</div>
                </div>
                <div className="min-h-0 h-full overflow-y-auto px-5 py-5 pb-8">
                  {activeLogMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">{T.noConversations[language]}</div>
                  ) : (
                    <div className="space-y-4">
                      {activeLogMessages.map((message) => {
                        const isUser = message.role === "user";
                        return (
                          <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[92%] rounded-[22px] px-5 py-4 shadow-sm ${isUser ? "bg-blue-600 text-white" : "border bg-white text-slate-900"}`}>
                              <MessageContent content={message.content} />
                              <div className={`mt-3 text-[11px] ${isUser ? "text-blue-100" : "text-slate-400"}`}>
                                {formatDate(message.created_at)}
                                {typeof message.total_tokens === "number" ? ` · ${message.total_tokens.toLocaleString()} tokens` : ""}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </main>

              <aside className="min-h-0 overflow-hidden rounded-2xl border bg-white">
                <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">{T.uploadedFiles[language]}</div>
                <div className="min-h-0 h-full overflow-y-auto px-3 py-3 pb-6">
                  {logViewer.files.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-slate-400">{T.noFiles[language]}</div>
                  ) : (
                    <div className="space-y-3">
                      {logViewer.files.map((file) => (
                        <div key={file.id} className="rounded-2xl border px-3 py-3">
                          <div className="line-clamp-2 text-sm font-semibold text-slate-900">{file.original_name}</div>
                          <div className="mt-2 text-xs text-slate-500">
                            {formatNumber(file.bytes)} B · {file.openai_status}
                            <br />
                            {formatDate(file.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

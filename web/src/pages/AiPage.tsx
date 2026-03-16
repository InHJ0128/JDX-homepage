
import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import axios from "axios";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

type Role = "user" | "assistant";

type AiMessage = {
  id: string | number;
  role: Role;
  content: string;
  created_at?: string;
  total_tokens?: number;
};

type AiConversation = {
  id: string | number;
  title: string;
  updated_at?: string;
  created_at?: string;
  last_message_preview?: string | null;
};

type UploadedFile = {
  id: number;
  original_name: string;
  bytes: number;
  openai_status: string;
  created_at?: string;
};

type AiConfigResponse = {
  enabled: boolean;
  userEnabled: boolean;
  blockReason?: string | null;
  platformStatus?: {
    state: "on" | "error" | "missing_api_key" | "unknown";
    label: string;
    message?: string | null;
    lastCheckedAt?: string | null;
  };
  tokenPolicy?: {
    dailyLimit?: number;
    monthlyLimit?: number;
    todayUsed?: number;
    monthUsed?: number;
    todayRemaining?: number | null;
    monthRemaining?: number | null;
  };
  model?: string;
};

type ContentPart = {
  type: "text" | "code";
  value: string;
  language?: string;
};

const T = {
  title: { ko: "AI", ja: "AI" },
  loginRequired: { ko: "AI 기능은 로그인 후 사용할 수 있습니다.", ja: "AI機能はログイン後に利用できます。" },
  infoLabel: { ko: "닉네임 / AI 정보", ja: "ニックネーム / AI情報" },
  files: { ko: "업로드된 파일들", ja: "アップロード済みファイル" },
  filesHint: { ko: "내가 업로드한 파일만 AI가 참고합니다.", ja: "自分がアップロードしたファイルのみAIが参照します。" },
  chats: { ko: "대화방 정보", ja: "会話情報" },
  newChat: { ko: "+ 새 대화", ja: "+ 新しい会話" },
  rename: { ko: "이름", ja: "名前" },
  renameLong: { ko: "이름 변경", ja: "名前変更" },
  renamePrompt: { ko: "새 대화 이름을 입력하세요.", ja: "新しい会話名を入力してください。" },
  delete: { ko: "삭제", ja: "削除" },
  deleteConfirm: { ko: "이 대화를 삭제할까요?", ja: "この会話を削除しますか？" },
  noChats: { ko: "대화가 없습니다.", ja: "会話がありません。" },
  noMessages: { ko: "아직 메시지가 없습니다. 첫 질문을 보내보세요.", ja: "まだメッセージがありません。最初の質問を送ってください。" },
  noFiles: { ko: "아직 업로드한 파일이 없습니다.", ja: "まだアップロードしたファイルがありません。" },
  placeholder: { ko: "질문을 입력하세요...", ja: "質問を入力してください..." },
  send: { ko: "보내기", ja: "送信" },
  sending: { ko: "전송 중...", ja: "送信中..." },
  upload: { ko: "업로드", ja: "アップロード" },
  uploading: { ko: "업로드 중...", ja: "アップロード中..." },
  todayUsed: { ko: "오늘 사용 토큰", ja: "本日の使用トークン" },
  monthUsed: { ko: "이번 달 사용 토큰", ja: "今月の使用トークン" },
  todayRemaining: { ko: "오늘 남은 토큰", ja: "本日の残りトークン" },
  monthRemaining: { ko: "이번 달 남은 토큰", ja: "今月の残りトークン" },
  status: { ko: "상태", ja: "状態" },
  on: { ko: "ON", ja: "ON" },
  off: { ko: "OFF", ja: "OFF" },
  platformError: { ko: "플랫폼 오류", ja: "プラットフォームエラー" },
  blockedGlobal: { ko: "관리자가 전체 AI 사용을 꺼두었습니다.", ja: "管理者が全体AI利用を無効にしています。" },
  blockedUser: { ko: "이 계정은 관리자에 의해 AI 사용이 꺼져 있습니다.", ja: "このアカウントでは管理者によりAI利用が無効化されています。" },
  blockedDaily: { ko: "오늘 사용 가능한 토큰을 모두 사용했습니다. 내일 다시 시도해주세요.", ja: "本日利用可能なトークンを使い切りました。明日もう一度お試しください。" },
  blockedMonthly: { ko: "이번 달 사용 가능한 토큰을 모두 사용했습니다. 다음 달에 다시 시도해주세요.", ja: "今月利用可能なトークンを使い切りました。来月もう一度お試しください。" },
  blockedPlatform: { ko: "OpenAI 플랫폼 연결에 문제가 있어 현재 사용할 수 없습니다.", ja: "OpenAIプラットフォーム接続に問題があり、現在利用できません。" },
  unknownBlock: { ko: "현재 AI를 사용할 수 없습니다.", ja: "現在AIを利用できません。" },
  loadFailed: { ko: "AI 정보를 불러오지 못했습니다.", ja: "AI情報を読み込めませんでした。" },
  filesFailed: { ko: "파일 목록을 불러오지 못했습니다.", ja: "ファイル一覧を読み込めませんでした。" },
  uploadFailed: { ko: "파일 업로드에 실패했습니다.", ja: "ファイルのアップロードに失敗しました。" },
  deleteFailed: { ko: "삭제에 실패했습니다.", ja: "削除に失敗しました。" },
  chatFailed: { ko: "AI 응답 생성에 실패했습니다.", ja: "AI応答の生成に失敗しました。" },
  copy: { ko: "복사", ja: "コピー" },
  copied: { ko: "복사됨", ja: "コピー済み" },
  chooseConversation: { ko: "대화를 선택하거나 새로 만들어주세요.", ja: "会話を選択するか新しく作成してください。" },
  loading: { ko: "불러오는 중...", ja: "読み込み中..." },
  untitled: { ko: "새 대화", ja: "新しい会話" },
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

function formatBytes(bytes?: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function conversationTitle(conversation: AiConversation | null | undefined, language: "ko" | "ja") {
  const value = (conversation?.title || "").trim();
  return value || T.untitled[language];
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
    parts.push({
      type: "code",
      language: match[1]?.trim() || undefined,
      value: (match[2] || "").replace(/^\n+|\n+$/g, ""),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text) parts.push({ type: "text", value: text });
  }

  return parts.length ? parts : [{ type: "text", value: content }];
}

function getBlockMessage(language: "ko" | "ja", config: AiConfigResponse | null) {
  const reason = config?.blockReason;
  if (!reason) return "";
  if (reason === "admin_global_off") return T.blockedGlobal[language];
  if (reason === "admin_user_off") return T.blockedUser[language];
  if (reason === "daily_limit_reached") return T.blockedDaily[language];
  if (reason === "monthly_limit_reached") return T.blockedMonthly[language];
  if (reason === "platform_error" || reason === "missing_api_key") {
    return config?.platformStatus?.message || T.blockedPlatform[language];
  }
  return T.unknownBlock[language];
}

function tokenizeCode(code: string): ReactNode[] {
  const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|\/\*[\s\S]*?\*\/|\b(?:const|let|var|function|return|if|else|for|while|class|import|from|export|default|try|catch|finally|throw|public|private|protected|static|new|async|await|def|print|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|ALTER|JOIN|ORDER|GROUP|BY|LIMIT)\b|\b\d+(?:\.\d+)?\b)/gm;
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      out.push(<Fragment key={`plain-${lastIndex}`}>{code.slice(lastIndex, match.index)}</Fragment>);
    }
    const value = match[0];
    let className = "text-slate-100";
    if (/^\/\//.test(value) || /^\/\*/.test(value)) className = "text-emerald-300";
    else if (/^["'`]/.test(value)) className = "text-amber-300";
    else if (/^\d/.test(value)) className = "text-sky-300";
    else className = "text-fuchsia-300";

    out.push(
      <span key={`tok-${match.index}`} className={className}>
        {value}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    out.push(<Fragment key={`tail-${lastIndex}`}>{code.slice(lastIndex)}</Fragment>);
  }

  return out;
}

function CodeBlock({
  code,
  language,
  onCopy,
  copied,
  copyLabel,
  copiedLabel,
}: {
  code: string;
  language?: string;
  onCopy: () => void;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
        <span className="font-medium uppercase">{language || "code"}</span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] hover:bg-slate-800"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="max-h-[48vh] overflow-auto p-4 text-[13px] leading-6 text-slate-100 select-text">
        <code>{tokenizeCode(code)}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content, isUser, language }: { content: string; isUser: boolean; language: "ko" | "ja" }) {
  const [copiedKey, setCopiedKey] = useState("");
  const parts = useMemo(() => parseMessageContent(content), [content]);

  const handleCopy = async (value: string, index: number) => {
    try {
      await navigator.clipboard.writeText(value);
      const key = `${index}-${value.length}`;
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1200);
    } catch (_err) {
      // noop
    }
  };

  return (
    <div className={`text-sm leading-7 ${isUser ? "text-white" : "text-slate-900"}`}>
      {parts.map((part, index) => {
        if (part.type === "code") {
          const key = `${index}-${part.value.length}`;
          return (
            <CodeBlock
              key={key}
              code={part.value}
              language={part.language}
              onCopy={() => handleCopy(part.value, index)}
              copied={copiedKey === key}
              copyLabel={T.copy[language]}
              copiedLabel={T.copied[language]}
            />
          );
        }
        return (
          <div key={`${index}-text`} className="whitespace-pre-wrap break-words select-text">
            {part.value}
          </div>
        );
      })}
    </div>
  );
}

export default function AiPage() {
  const { language } = useLanguage() as { language: "ko" | "ja" };
  const { user } = useAuth() as { user?: any };

  const [config, setConfig] = useState<AiConfigResponse | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | number | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | number | null>(null);
  const [renamingConversationId, setRenamingConversationId] = useState<string | number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageScrollerRef = useRef<HTMLDivElement | null>(null);

  const isLoggedIn = !!user;
  const blockMessage = getBlockMessage(language, config);
  const canSend = !!config && !config.blockReason && !sending;
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );
  const profileName = user?.nickname || user?.name || user?.username || user?.id || "USER";

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    messageScrollerRef.current?.scrollTo({ top: messageScrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const refreshConfig = async () => {
    const res = await axios.get("/api/ai/config");
    setConfig(res.data);
  };

  const refreshFiles = async () => {
    const res = await axios.get("/api/ai/files");
    setUploadedFiles(res.data?.files || []);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setLoadingConfig(false);
      return;
    }

    const load = async () => {
      setLoadingConfig(true);
      setError("");
      try {
        const [configRes, conversationsRes, filesRes] = await Promise.all([
          axios.get("/api/ai/config"),
          axios.get("/api/ai/conversations"),
          axios.get("/api/ai/files"),
        ]);
        const nextConversations = conversationsRes.data?.conversations || [];
        setConfig(configRes.data);
        setConversations(nextConversations);
        setUploadedFiles(filesRes.data?.files || []);
        if (nextConversations.length > 0) {
          setSelectedConversationId((prev) => prev ?? nextConversations[0].id);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || T.loadFailed[language]);
      } finally {
        setLoadingConfig(false);
      }
    };

    load();
  }, [isLoggedIn, language]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await axios.get(`/api/ai/conversations/${selectedConversationId}/messages`);
        setMessages(res.data?.messages || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || T.loadFailed[language]);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedConversationId, language]);

  const handleCreateConversation = async () => {
    const res = await axios.post("/api/ai/conversations", { title: T.untitled[language] });
    const created = res.data?.conversation;
    if (!created) return null;
    setConversations((prev) => [created, ...prev]);
    setSelectedConversationId(created.id);
    setMessages([]);
    return created;
  };

  const handleRenameConversation = async (conversationId: string | number) => {
    const current = conversations.find((item) => item.id === conversationId);
    const nextTitle = window.prompt(T.renamePrompt[language], conversationTitle(current, language));
    if (nextTitle === null) return;
    const title = nextTitle.trim();
    if (!title) return;

    setRenamingConversationId(conversationId);
    try {
      await axios.patch(`/api/ai/conversations/${conversationId}`, { title });
      setConversations((prev) => prev.map((item) => (item.id === conversationId ? { ...item, title } : item)));
    } catch (err: any) {
      setError(err?.response?.data?.message || T.deleteFailed[language]);
    } finally {
      setRenamingConversationId(null);
    }
  };

  const handleDeleteConversation = async (conversationId: string | number) => {
    if (!window.confirm(T.deleteConfirm[language])) return;
    setDeletingConversationId(conversationId);
    try {
      await axios.delete(`/api/ai/conversations/${conversationId}`);
      setConversations((prev) => {
        const next = prev.filter((item) => item.id !== conversationId);
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(next[0]?.id ?? null);
          if (next.length === 0) setMessages([]);
        }
        return next;
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || T.deleteFailed[language]);
    } finally {
      setDeletingConversationId(null);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post("/api/ai/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshFiles();
    } catch (err: any) {
      setError(err?.response?.data?.message || T.uploadFailed[language]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      await axios.delete(`/api/ai/files/${fileId}`);
      setUploadedFiles((prev) => prev.filter((item) => item.id !== fileId));
    } catch (err: any) {
      setError(err?.response?.data?.message || T.deleteFailed[language]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !canSend) return;

    let activeConversationId = selectedConversationId;
    if (!activeConversationId) {
      const created = await handleCreateConversation();
      if (!created?.id) return;
      activeConversationId = created.id;
    }

    const optimistic: AiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);
    setError("");

    try {
      const res = await axios.post("/api/ai/chat", {
        conversationId: activeConversationId,
        message: trimmed,
        language,
      });

      const assistantMessage: AiMessage = res.data?.message || {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.data?.answer || "",
        created_at: new Date().toISOString(),
        total_tokens: res.data?.usage?.totalTokens,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversations((prev) =>
        prev
          .map((item) =>
            item.id === activeConversationId
              ? { ...item, updated_at: new Date().toISOString(), last_message_preview: trimmed }
              : item
          )
          .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      );

      if (res.data?.config) {
        setConfig(res.data.config);
      } else {
        await refreshConfig();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || T.chatFailed[language]);
      await refreshConfig().catch(() => undefined);
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">{T.title[language]}</h1>
          <p className="mt-3 text-gray-600">{T.loginRequired[language]}</p>
        </div>
      </div>
    );
  }

  if (loadingConfig) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-[60px] bg-white px-4 py-3">
        <div className="flex h-full items-center justify-center rounded-3xl border bg-white text-gray-500">
          {T.loading[language]}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-[60px] overflow-hidden bg-white px-4 py-3">
      <div className="grid h-full min-h-0 grid-cols-[250px_minmax(0,1fr)_270px] gap-3">
        <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">{T.infoLabel[language]}</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{profileName}</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{T.todayUsed[language]}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(config?.tokenPolicy?.todayUsed || 0)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{T.todayRemaining[language]}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(config?.tokenPolicy?.todayRemaining ?? null)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{T.monthRemaining[language]}</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{formatNumber(config?.tokenPolicy?.monthRemaining ?? null)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{T.status[language]}</div>
                <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  config?.blockReason ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {config?.blockReason ? T.off[language] : T.on[language]}
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">{T.chats[language]}</div>
              <button
                type="button"
                onClick={() => handleCreateConversation()}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {T.newChat[language]}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-slate-400">
                  {T.noChats[language]}
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conversation) => {
                    const active = conversation.id === selectedConversationId;
                    return (
                      <button
                        type="button"
                        key={String(conversation.id)}
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          active ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="line-clamp-1 text-sm font-semibold text-slate-900">
                          {conversationTitle(conversation, language)}
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {conversation.last_message_preview || formatDate(conversation.updated_at || conversation.created_at)}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameConversation(conversation.id);
                            }}
                            disabled={renamingConversationId === conversation.id}
                            className="rounded-lg border px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            {T.rename[language]}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conversation.id);
                            }}
                            disabled={deletingConversationId === conversation.id}
                            className="rounded-lg border px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            {T.delete[language]}
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{T.infoLabel[language]}</div>
              <div className="mt-1 truncate text-lg font-semibold text-slate-900">
                {profileName} · {conversationTitle(selectedConversation, language)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {config?.model || "gpt-5-mini"}
              </span>
              {selectedConversation ? (
                <button
                  type="button"
                  onClick={() => handleRenameConversation(selectedConversation.id)}
                  className="rounded-xl border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {T.renameLong[language]}
                </button>
              ) : null}
            </div>
          </div>

          {blockMessage ? (
            <div className="shrink-0 border-b bg-amber-50 px-4 py-2 text-sm text-amber-700">{blockMessage}</div>
          ) : null}
          {error ? (
            <div className="shrink-0 border-b bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div ref={messageScrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!selectedConversationId ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-slate-400">
                {T.chooseConversation[language]}
              </div>
            ) : loadingMessages ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">{T.loading[language]}</div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-slate-400">
                {T.noMessages[language]}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div key={String(message.id)} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[88%] rounded-[22px] px-5 py-4 shadow-sm ${
                          isUser ? "bg-blue-600 text-white" : "border bg-white text-slate-900"
                        }`}
                      >
                        <MessageContent content={message.content} isUser={isUser} language={language} />
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

          <form onSubmit={handleSubmit} className="shrink-0 border-t bg-white p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                disabled={!canSend}
                placeholder={T.placeholder[language]}
                className="min-h-[108px] flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100"
              />
              <div className="flex w-[104px] shrink-0 flex-col gap-2">
                <button
                  type="submit"
                  disabled={!input.trim() || !canSend}
                  className="rounded-2xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {sending ? T.sending[language] : T.send[language]}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
                >
                  {uploading ? T.uploading[language] : T.upload[language]}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </form>
        </main>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">{T.files[language]}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{T.filesHint[language]}</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {uploadedFiles.length === 0 ? (
              <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-slate-400">
                {T.noFiles[language]}
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="rounded-2xl border px-3 py-3">
                    <div className="line-clamp-2 text-sm font-semibold text-slate-900">{file.original_name}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {formatBytes(file.bytes)} · {file.openai_status}
                      <br />
                      {formatDate(file.created_at)}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.id)}
                        className="rounded-lg border px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                      >
                        {T.delete[language]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

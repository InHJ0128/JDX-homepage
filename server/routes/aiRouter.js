
const express = require("express");
const OpenAI = require("openai");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const db = require("../db");

const router = express.Router();

const AI_UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "ai-files");
fs.mkdirSync(AI_UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".py", ".java",
  ".c", ".cpp", ".cs", ".go", ".php", ".rb", ".sh", ".html", ".css",
  ".xml", ".yml", ".yaml", ".sql", ".pdf", ".docx", ".pptx",
]);

const platformState = {
  state: "unknown",
  label: "UNKNOWN",
  message: null,
  lastCheckedAt: null,
};

function setPlatformOk() {
  platformState.state = "on";
  platformState.label = "ON";
  platformState.message = null;
  platformState.lastCheckedAt = new Date().toISOString();
}

function setPlatformError(code, message) {
  platformState.state = code === "missing_api_key" ? "missing_api_key" : "error";
  platformState.label = code === "missing_api_key" ? "NO KEY" : "ERROR";
  platformState.message = message || null;
  platformState.lastCheckedAt = new Date().toISOString();
}

function normalizeOriginalName(name) {
  const fallback = "file";
  if (!name) return fallback;

  try {
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(name)) return name.normalize("NFC");
    if (/[À-ÿ]/.test(name)) {
      const decoded = Buffer.from(name, "latin1").toString("utf8");
      if (decoded && !decoded.includes("�")) return decoded.normalize("NFC");
    }
    return name.normalize("NFC");
  } catch (_err) {
    return name;
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AI_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const originalName = normalizeOriginalName(file.originalname);
    const ext = path.extname(originalName || "").toLowerCase();
    const base = path.basename(originalName || "file", ext).replace(/[^a-zA-Z0-9-_가-힣]/g, "_");
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(normalizeOriginalName(file.originalname || "")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("지원하지 않는 파일 형식입니다."));
    }
    cb(null, true);
  },
});

function requireLogin(req, res, next) {
  if (!req.session?.user?.id) return res.status(401).json({ message: "로그인이 필요합니다." });
  next();
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    setPlatformError("missing_api_key", "OPENAI_API_KEY가 설정되지 않았습니다.");
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }
  return new OpenAI({ apiKey });
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getSetting(connection, key, fallback) {
  const [rows] = await connection.query(
    "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
    [key]
  );
  return rows[0]?.setting_value ?? fallback;
}

async function getUsage(connection, userId) {
  const [todayRows] = await connection.query(
    `SELECT COALESCE(SUM(total_tokens), 0) AS used
     FROM ai_messages
     WHERE user_id = ? AND created_at >= ?`,
    [userId, todayStart()]
  );

  const [monthRows] = await connection.query(
    `SELECT COALESCE(SUM(total_tokens), 0) AS used
     FROM ai_messages
     WHERE user_id = ? AND created_at >= ?`,
    [userId, monthStart()]
  );

  return {
    todayUsed: Number(todayRows[0]?.used || 0),
    monthUsed: Number(monthRows[0]?.used || 0),
  };
}

async function getUserAiState(connection, userId) {
  const [rows] = await connection.query(
    `SELECT
      u.user_no AS user_id,
      u.id AS login_id,
      u.nickname,
      u.ai_enabled,
      u.ai_daily_token_limit,
      u.ai_monthly_token_limit
     FROM users u
     WHERE u.user_no = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

function getPlatformStatusPayload() {
  if (!process.env.OPENAI_API_KEY) {
    return {
      state: "missing_api_key",
      label: "NO KEY",
      message: "OPENAI_API_KEY가 설정되지 않았습니다.",
      lastCheckedAt: null,
    };
  }
  if (platformState.state === "unknown") {
    return {
      state: "on",
      label: "ON",
      message: null,
      lastCheckedAt: null,
    };
  }
  return { ...platformState };
}

async function buildConfigPayload(connection, userId) {
  const [enabledRaw, model, defaultDailyRaw, defaultMonthlyRaw] = await Promise.all([
    getSetting(connection, "ai_enabled", "1"),
    getSetting(connection, "ai_default_model", "gpt-5-mini"),
    getSetting(connection, "ai_default_daily_token_limit", "30000"),
    getSetting(connection, "ai_default_monthly_token_limit", "300000"),
  ]);

  const globalEnabled = Number(enabledRaw) === 1;
  const user = await getUserAiState(connection, userId);
  const usage = await getUsage(connection, userId);
  const platformStatus = getPlatformStatusPayload();

  const dailyLimit = Number(user?.ai_daily_token_limit || defaultDailyRaw || 0);
  const monthlyLimit = Number(user?.ai_monthly_token_limit || defaultMonthlyRaw || 0);
  let blockReason = null;

  if (!globalEnabled) blockReason = "admin_global_off";
  else if (Number(user?.ai_enabled || 0) !== 1) blockReason = "admin_user_off";
  else if (platformStatus.state !== "on") blockReason = platformStatus.state === "missing_api_key" ? "missing_api_key" : "platform_error";
  else if (dailyLimit > 0 && usage.todayUsed >= dailyLimit) blockReason = "daily_limit_reached";
  else if (monthlyLimit > 0 && usage.monthUsed >= monthlyLimit) blockReason = "monthly_limit_reached";

  return {
    enabled: globalEnabled,
    userEnabled: Number(user?.ai_enabled || 0) === 1,
    blockReason,
    platformStatus,
    tokenPolicy: {
      dailyLimit,
      monthlyLimit,
      todayUsed: usage.todayUsed,
      monthUsed: usage.monthUsed,
      todayRemaining: dailyLimit > 0 ? Math.max(0, dailyLimit - usage.todayUsed) : null,
      monthRemaining: monthlyLimit > 0 ? Math.max(0, monthlyLimit - usage.monthUsed) : null,
    },
    model,
  };
}

async function assertConversationOwner(connection, conversationId, userId) {
  const [rows] = await connection.query(
    "SELECT id, user_id, title FROM ai_conversations WHERE id = ? LIMIT 1",
    [conversationId]
  );
  const row = rows[0];
  if (!row) return { ok: false, status: 404, message: "대화를 찾을 수 없습니다." };
  if (Number(row.user_id) !== Number(userId)) {
    return { ok: false, status: 403, message: "이 대화에 접근할 권한이 없습니다." };
  }
  return { ok: true, conversation: row };
}


async function createPrivateFileSpaceRecord(connection, userId, vectorStoreId) {
  const [existingRows] = await connection.query(
    `SELECT id, openai_vector_store_id, name
     FROM ai_file_spaces
     WHERE scope_type = 'user' AND scope_id = ?
     LIMIT 1`,
    [userId]
  );

  if (existingRows[0]) {
    await connection.query(
      `UPDATE ai_file_spaces
       SET openai_vector_store_id = ?
       WHERE id = ?`,
      [vectorStoreId, existingRows[0].id]
    );
    return { ...existingRows[0], openai_vector_store_id: vectorStoreId };
  }

  const [result] = await connection.query(
    `INSERT INTO ai_file_spaces (scope_type, scope_id, name, openai_vector_store_id, created_by_user_id)
     VALUES ('user', ?, ?, ?, ?)`,
    [userId, `사용자 ${userId} 파일`, vectorStoreId, userId]
  );

  return {
    id: result.insertId,
    openai_vector_store_id: vectorStoreId,
    name: `사용자 ${userId} 파일`,
  };
}

async function createFreshVectorStore(connection, openai, userId) {
  const vectorStore = await openai.vectorStores.create({ name: `user-${userId}-private-files` });
  return createPrivateFileSpaceRecord(connection, userId, vectorStore.id);
}

async function getExistingPrivateFileSpace(connection, userId) {
  const [rows] = await connection.query(
    `SELECT id, openai_vector_store_id, name
     FROM ai_file_spaces
     WHERE scope_type = 'user' AND scope_id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function isVectorStoreMissing(openai, vectorStoreId) {
  try {
    await openai.vectorStores.retrieve(vectorStoreId);
    return false;
  } catch (err) {
    const msg = err?.message || String(err);
    if (/vector store.*not found|No vector store found|404/i.test(msg)) return true;
    throw err;
  }
}

async function reattachFilesToVectorStore(connection, openai, userId, spaceId, vectorStoreId) {
  const [files] = await connection.query(
    `SELECT id, openai_file_id
     FROM ai_uploaded_files
     WHERE space_id = ? AND deleted_at IS NULL AND openai_file_id IS NOT NULL
     ORDER BY id ASC`,
    [spaceId]
  );

  for (const file of files) {
    try {
      const attached = await openai.vectorStores.files.create(vectorStoreId, {
        file_id: file.openai_file_id,
        attributes: { owner_user_id: Number(userId) },
      });

      await connection.query(
        `UPDATE ai_uploaded_files
         SET openai_vector_store_file_id = ?, openai_status = ?
         WHERE id = ?`,
        [attached.id || null, attached.status || 'in_progress', file.id]
      );
    } catch (err) {
      const msg = err?.message || String(err);
      if (/No such file|not found|404/i.test(msg)) {
        await connection.query(
          `UPDATE ai_uploaded_files
           SET openai_status = 'missing_on_openai'
           WHERE id = ?`,
          [file.id]
        );
        continue;
      }
      throw err;
    }
  }
}

async function ensurePrivateFileSpace(connection, openai, userId) {
  const existing = await getExistingPrivateFileSpace(connection, userId);

  if (!existing?.openai_vector_store_id) {
    return createFreshVectorStore(connection, openai, userId);
  }

  const missing = await isVectorStoreMissing(openai, existing.openai_vector_store_id);
  if (!missing) return existing;

  const repaired = await createFreshVectorStore(connection, openai, userId);
  await reattachFilesToVectorStore(connection, openai, userId, repaired.id, repaired.openai_vector_store_id);
  return repaired;
}

function buildSystemPrompt(language) {
  if (language === "ja") {
    return [
      "あなたは釜山外国語大学 日本ITサークルのAIアシスタントです。",
      "ユーザーが質問した言語でのみ、簡潔かつ正確に答えてください。",
      "ファイルがなくても、一般知識・プログラミング・公開されたインターネット情報で答えられる質問にはそのまま答えてください。",
      "現在の会話にユーザーがアップロードしたファイルがあれば、その内容を優先して参照してください。",
      "最新性が重要な公開情報や、ウェブ上で確認できる内容は web_search を積極的に使って確認してから答えてください。",
      "ファイル分析やアップロード済み資料に関する質問では file_search を使ってください。",
      "『ファイルがないので答えられません』のように最初から断らず、答えられる範囲の回答を先に提示してください。",
      "本当に必要な場合を除き、不要な確認質問はしないでください。",
      "コードを提示する時は必ず```言語名の fenced code blockで示してください。",
    ].join(" ");
  }

  return [
    "너는 부산외대 일본 IT 동아리 홈페이지의 AI 도우미다.",
    "사용자가 질문한 언어로만 간결하고 정확하게 답하라.",
    "파일이 없어도 일반 지식, 프로그래밍, 공개 인터넷 정보로 답할 수 있는 질문은 바로 답하라.",
    "사용자가 업로드한 파일이 있으면 그 내용도 우선 참고하라.",
    "최신성이 중요하거나 웹에서 확인 가능한 공개 정보는 web_search를 적극적으로 사용해 확인 후 답하라.",
    "업로드 파일 분석이나 파일 내용 관련 질문은 file_search를 사용하라.",
    "처음부터 '파일이 없어서 답할 수 없다'고 막지 말고, 가능한 범위의 답부터 제공하라.",
    "정말 필요한 경우가 아니면 되묻지 말고 바로 핵심 답변을 해라.",
    "코드를 제시할 때는 반드시 ```언어명 형식의 fenced code block으로 보여줘."
  ].join(" ");
}

router.get("/config", requireLogin, async (req, res) => {
  try {
    const payload = await buildConfigPayload(db, req.session.user.id);
    res.json(payload);
  } catch (err) {
    console.error("[AI] GET /config error:", err);
    res.status(500).json({ message: "AI 설정을 불러오지 못했습니다." });
  }
});

router.get("/files", requireLogin, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const openai = getOpenAI();
    const userSpace = await ensurePrivateFileSpace(connection, openai, req.session.user.id);
    const [rows] = await connection.query(
      `SELECT id, original_name, bytes, openai_status, created_at
       FROM ai_uploaded_files
       WHERE deleted_at IS NULL AND space_id = ?
       ORDER BY id DESC`,
      [userSpace.id]
    );
    res.json({ files: rows });
  } catch (err) {
    console.error("[AI] GET /files error:", err);
    res.status(500).json({ message: "업로드 파일 목록을 불러오지 못했습니다." });
  } finally {
    connection.release();
  }
});

router.post("/files/upload", requireLogin, upload.single("file"), async (req, res) => {
  const userId = req.session.user.id;
  const connection = await db.getConnection();

  if (!req.file) {
    connection.release();
    return res.status(400).json({ message: "업로드할 파일이 없습니다." });
  }

  try {
    const openai = getOpenAI();
    const userSpace = await ensurePrivateFileSpace(connection, openai, userId);
    const originalName = normalizeOriginalName(req.file.originalname);

    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(req.file.path),
      purpose: "user_data",
    });

    const vectorStoreFile = await openai.vectorStores.files.create(userSpace.openai_vector_store_id, {
      file_id: uploadedFile.id,
      attributes: {
        owner_user_id: Number(userId),
      },
    });

    await connection.query(
      `INSERT INTO ai_uploaded_files (
        uploader_user_id, space_id, original_name, stored_name, local_path,
        mime_type, bytes, openai_file_id, openai_vector_store_file_id, openai_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userSpace.id,
        originalName,
        req.file.filename,
        req.file.path,
        req.file.mimetype || null,
        req.file.size || 0,
        uploadedFile.id,
        vectorStoreFile.id,
        vectorStoreFile.status || "in_progress",
      ]
    );

    setPlatformOk();
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("[AI] POST /files/upload error:", err);
    setPlatformError("error", err?.message || "파일 업로드 실패");
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_e) {}
    }
    res.status(500).json({ message: err.message || "파일 업로드 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

router.delete("/files/:fileId", requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const fileId = Number(req.params.fileId);
  const connection = await db.getConnection();

  try {
    const [rows] = await connection.query(
      `SELECT f.*, s.openai_vector_store_id
       FROM ai_uploaded_files f
       JOIN ai_file_spaces s ON s.id = f.space_id
       WHERE f.id = ? AND f.deleted_at IS NULL
       LIMIT 1`,
      [fileId]
    );
    const file = rows[0];
    if (!file) return res.status(404).json({ message: "파일을 찾을 수 없습니다." });
    if (Number(file.uploader_user_id) !== Number(userId)) {
      return res.status(403).json({ message: "이 파일을 삭제할 권한이 없습니다." });
    }

    const openai = getOpenAI();

    if (file.openai_file_id) {
      try {
        await openai.files.del(file.openai_file_id);
      } catch (e) {
        const msg = e?.message || String(e);
        if (!/No such file|not found|404/i.test(msg)) throw new Error(`OpenAI 파일 삭제 실패: ${msg}`);
      }
    } else if (file.openai_vector_store_file_id && file.openai_vector_store_id) {
      try {
        await openai.vectorStores.files.del(file.openai_vector_store_id, file.openai_vector_store_file_id);
      } catch (e) {
        const msg = e?.message || String(e);
        if (!/No such file|not found|404/i.test(msg)) throw new Error(`OpenAI 벡터스토어 파일 삭제 실패: ${msg}`);
      }
    }

    await connection.query(
      `UPDATE ai_uploaded_files
       SET deleted_at = NOW(), openai_status = 'deleted'
       WHERE id = ?`,
      [fileId]
    );

    if (file.local_path && fs.existsSync(file.local_path)) {
      try { fs.unlinkSync(file.local_path); } catch (_e) {}
    }

    setPlatformOk();
    res.json({ success: true });
  } catch (err) {
    console.error("[AI] DELETE /files/:fileId error:", err);
    setPlatformError("error", err?.message || "파일 삭제 실패");
    res.status(500).json({ message: err.message || "파일 삭제 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

router.get("/conversations", requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        c.id, c.title, c.created_at, c.updated_at,
        (SELECT m.content FROM ai_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_preview
       FROM ai_conversations c
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC, c.id DESC`,
      [req.session.user.id]
    );
    res.json({ conversations: rows });
  } catch (err) {
    console.error("[AI] GET /conversations error:", err);
    res.status(500).json({ message: "대화 목록을 불러오지 못했습니다." });
  }
});

router.post("/conversations", requireLogin, async (req, res) => {
  const title = String(req.body?.title || "새 대화").trim().slice(0, 255) || "새 대화";
  try {
    const [result] = await db.query(
      "INSERT INTO ai_conversations (user_id, title) VALUES (?, ?)",
      [req.session.user.id, title]
    );
    res.status(201).json({
      conversation: {
        id: result.insertId,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_preview: null,
      },
    });
  } catch (err) {
    console.error("[AI] POST /conversations error:", err);
    res.status(500).json({ message: "대화를 생성하지 못했습니다." });
  }
});

router.patch("/conversations/:conversationId", requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const conversationId = Number(req.params.conversationId);
  const title = String(req.body?.title || "").trim().slice(0, 255);

  if (!title) return res.status(400).json({ message: "대화 이름을 입력해주세요." });

  const connection = await db.getConnection();
  try {
    const check = await assertConversationOwner(connection, conversationId, userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    await connection.query(
      "UPDATE ai_conversations SET title = ?, updated_at = NOW() WHERE id = ?",
      [title, conversationId]
    );
    res.json({ success: true, title });
  } catch (err) {
    console.error("[AI] PATCH /conversations/:conversationId error:", err);
    res.status(500).json({ message: "대화 이름을 변경하지 못했습니다." });
  } finally {
    connection.release();
  }
});

router.delete("/conversations/:conversationId", requireLogin, async (req, res) => {
  const connection = await db.getConnection();
  const userId = req.session.user.id;
  const conversationId = Number(req.params.conversationId);

  try {
    const check = await assertConversationOwner(connection, conversationId, userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    await connection.beginTransaction();
    await connection.query("DELETE FROM ai_messages WHERE conversation_id = ?", [conversationId]);
    await connection.query("DELETE FROM ai_conversations WHERE id = ?", [conversationId]);
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error("[AI] DELETE /conversations/:conversationId error:", err);
    res.status(500).json({ message: "대화를 삭제하지 못했습니다." });
  } finally {
    connection.release();
  }
});

router.get("/conversations/:conversationId/messages", requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const conversationId = Number(req.params.conversationId);

  try {
    const check = await assertConversationOwner(db, conversationId, userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const [rows] = await db.query(
      `SELECT id, role, content, created_at, total_tokens
       FROM ai_messages
       WHERE conversation_id = ?
       ORDER BY id ASC`,
      [conversationId]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error("[AI] GET /conversations/:conversationId/messages error:", err);
    res.status(500).json({ message: "메시지를 불러오지 못했습니다." });
  }
});

router.post("/chat", requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const language = req.body?.language === "ja" ? "ja" : "ko";
  const conversationId = Number(req.body?.conversationId);
  const message = String(req.body?.message || "").trim();

  if (!conversationId) return res.status(400).json({ message: "conversationId가 필요합니다." });
  if (!message) return res.status(400).json({ message: "질문 내용을 입력해주세요." });
  if (message.length > 12000) return res.status(400).json({ message: "질문이 너무 깁니다." });

  const connection = await db.getConnection();

  try {
    const config = await buildConfigPayload(connection, userId);
    if (config.blockReason) {
      const messageMap = {
        admin_global_off: "현재 AI 기능이 비활성화되어 있습니다.",
        admin_user_off: "이 계정은 AI 사용이 비활성화되어 있습니다.",
        daily_limit_reached: "오늘 사용 가능한 토큰을 모두 사용했습니다.",
        monthly_limit_reached: "이번 달 사용 가능한 토큰을 모두 사용했습니다.",
        platform_error: config.platformStatus?.message || "OpenAI 플랫폼 오류로 현재 사용할 수 없습니다.",
        missing_api_key: "OPENAI_API_KEY가 설정되지 않았습니다.",
      };
      return res.status(429).json({
        message: messageMap[config.blockReason] || "현재 AI를 사용할 수 없습니다.",
        code: config.blockReason,
        config,
      });
    }

    const check = await assertConversationOwner(connection, conversationId, userId);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO ai_messages (conversation_id, user_id, role, content, credits_used)
       VALUES (?, ?, 'user', ?, 0)`,
      [conversationId, userId, message]
    );

    const [historyRows] = await connection.query(
      `SELECT role, content
       FROM ai_messages
       WHERE conversation_id = ?
       ORDER BY id DESC
       LIMIT 12`,
      [conversationId]
    );

    const openai = getOpenAI();
    const userSpace = await ensurePrivateFileSpace(connection, openai, userId);
    const tools = [];

    if (userSpace?.openai_vector_store_id) {
      tools.push({
        type: "file_search",
        vector_store_ids: [userSpace.openai_vector_store_id],
        max_num_results: 4,
      });
    }

    tools.push({ type: "web_search_preview" });

    const response = await openai.responses.create({
      model: config.model || process.env.OPENAI_DEFAULT_MODEL || "gpt-5-mini",
      input: [
        { role: "system", content: buildSystemPrompt(language) },
        ...historyRows.reverse().map((row) => ({ role: row.role, content: row.content })),
      ],
      tools,
      include: ["file_search_call.results"],
    });

    const answer = response.output_text || "응답을 생성하지 못했습니다.";
    const usage = response.usage || {};
    const inputTokens = Number(usage.input_tokens || 0);
    const outputTokens = Number(usage.output_tokens || 0);
    const totalTokens = Number(usage.total_tokens || inputTokens + outputTokens);

    const [assistantInsert] = await connection.query(
      `INSERT INTO ai_messages (
        conversation_id, user_id, role, content, model,
        input_tokens, output_tokens, total_tokens, credits_used, openai_response_id
      ) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, 0, ?)`,
      [
        conversationId,
        userId,
        answer,
        response.model || config.model,
        inputTokens,
        outputTokens,
        totalTokens,
        response.id || null,
      ]
    );

    await connection.query(
      `UPDATE ai_conversations
       SET updated_at = NOW()
       WHERE id = ?`,
      [conversationId]
    );

    await connection.commit();
    setPlatformOk();

    const nextConfig = await buildConfigPayload(db, userId);

    res.json({
      message: {
        id: assistantInsert.insertId,
        role: "assistant",
        content: answer,
        created_at: new Date().toISOString(),
        total_tokens: totalTokens,
      },
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
      },
      config: nextConfig,
    });
  } catch (err) {
    await connection.rollback();
    console.error("[AI] POST /chat error:", err);
    setPlatformError("error", err?.message || "OpenAI 호출 실패");
    res.status(500).json({ message: err?.message || "AI 응답 생성에 실패했습니다." });
  } finally {
    connection.release();
  }
});

module.exports = router;

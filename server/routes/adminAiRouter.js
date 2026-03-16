
const express = require("express");
const db = require("../db");

const router = express.Router();

function verifyAdmin(req, res, next) {
  if (req.session?.user?.is_admin === 1) return next();
  return res.status(403).json({ message: "관리자만 접근 가능합니다." });
}

async function getSetting(key, fallback) {
  const [rows] = await db.query(
    "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
    [key]
  );
  return rows[0]?.setting_value ?? fallback;
}

async function setSetting(connection, key, value) {
  await connection.query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, String(value)]
  );
}

function startOfTodayUnix() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function startOfMonthUnix() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function sumUsageBuckets(payload) {
  const buckets = Array.isArray(payload?.data) ? payload.data : [];
  let input = 0;
  let output = 0;
  let total = 0;
  let requests = 0;

  for (const bucket of buckets) {
    const results = Array.isArray(bucket?.result) ? bucket.result : [];
    for (const item of results) {
      const inputTokens = Number(item?.input_tokens || 0);
      const outputTokens = Number(item?.output_tokens || 0);
      input += inputTokens;
      output += outputTokens;
      total += Number(item?.total_tokens || inputTokens + outputTokens);
      requests += Number(item?.num_model_requests || 0);
    }
  }

  return { input, output, total, requests };
}

function sumCosts(payload) {
  const buckets = Array.isArray(payload?.data) ? payload.data : [];
  let amount = 0;
  for (const bucket of buckets) {
    const results = Array.isArray(bucket?.result) ? bucket.result : [];
    for (const item of results) {
      amount += Number(item?.amount?.value || item?.amount || 0);
    }
  }
  return amount;
}

async function fetchJson(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(text || `Request failed: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

async function fetchPlatformSummary() {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  const projectId = process.env.OPENAI_PROJECT_ID || "";
  const projectParam = projectId ? `&project_ids[]=${encodeURIComponent(projectId)}` : "";

  if (!adminKey) {
    return {
      available: false,
      status: "missing_admin_key",
      label: "NO ADMIN KEY",
      message: "OPENAI_ADMIN_KEY가 없어 플랫폼 사용량을 직접 읽지 못합니다.",
      remainingCreditsUsd: null,
      todayTokens: 0,
      monthTokens: 0,
      monthCostUsd: null,
      source: "official_usage_api",
    };
  }

  try {
    const startToday = startOfTodayUnix();
    const startMonth = startOfMonthUnix();
    const end = nowUnix();

    const [todayUsage, monthUsage, monthCosts] = await Promise.all([
      fetchJson(`https://api.openai.com/v1/organization/usage/completions?start_time=${startToday}&end_time=${end}&bucket_width=1d${projectParam}`, adminKey),
      fetchJson(`https://api.openai.com/v1/organization/usage/completions?start_time=${startMonth}&end_time=${end}&bucket_width=1d${projectParam}`, adminKey),
      fetchJson(`https://api.openai.com/v1/organization/costs?start_time=${startMonth}&end_time=${end}&bucket_width=1d${projectParam}`, adminKey),
    ]);

    let remainingCreditsUsd = null;
    try {
      // Best-effort fallback. Not part of the currently documented admin APIs.
      const balancePayload = await fetchJson("https://api.openai.com/dashboard/billing/credit_grants", adminKey);
      const totalGranted = Number(balancePayload?.total_granted || 0);
      const totalUsed = Number(balancePayload?.total_used || 0);
      remainingCreditsUsd = Math.max(0, totalGranted - totalUsed);
    } catch (_balanceErr) {
      remainingCreditsUsd = null;
    }

    return {
      available: true,
      status: "on",
      label: "ON",
      message: null,
      remainingCreditsUsd,
      todayTokens: sumUsageBuckets(todayUsage).total,
      monthTokens: sumUsageBuckets(monthUsage).total,
      monthCostUsd: sumCosts(monthCosts),
      source: "official_usage_api",
    };
  } catch (err) {
    return {
      available: false,
      status: "error",
      label: "PLATFORM ERROR",
      message: err?.message || "플랫폼 사용량 조회 실패",
      remainingCreditsUsd: null,
      todayTokens: 0,
      monthTokens: 0,
      monthCostUsd: null,
      source: "official_usage_api",
    };
  }
}

function buildEffectiveStatus({ globalEnabled, userEnabled, platformStatus }) {
  if (!globalEnabled) {
    return { state: "admin_off", label: "ADMIN OFF" };
  }
  if (!userEnabled) {
    return { state: "user_off", label: "USER OFF" };
  }
  if (platformStatus !== "on") {
    return { state: "platform_error", label: "PLATFORM ERR" };
  }
  return { state: "on", label: "ON" };
}

router.get("/overview", verifyAdmin, async (_req, res) => {
  try {
    const [globalEnabledRaw, defaultModel, defaultDailyRaw, defaultMonthlyRaw, requestLimitRaw] = await Promise.all([
      getSetting("ai_enabled", "1"),
      getSetting("ai_default_model", "gpt-5-mini"),
      getSetting("ai_default_daily_token_limit", "30000"),
      getSetting("ai_default_monthly_token_limit", "300000"),
      getSetting("ai_request_token_limit", "0"),
    ]);

    const platform = await fetchPlatformSummary();
    const globalEnabled = Number(globalEnabledRaw) === 1;

    const [users] = await db.query(
      `SELECT
        u.user_no AS user_id,
        u.id AS login_id,
        u.nickname,
        u.ai_enabled,
        u.ai_daily_token_limit,
        u.ai_monthly_token_limit,
        COALESCE((SELECT SUM(total_tokens) FROM ai_messages m WHERE m.user_id = u.user_no AND m.created_at >= CURDATE()), 0) AS today_used_tokens,
        COALESCE((SELECT SUM(total_tokens) FROM ai_messages m WHERE m.user_id = u.user_no AND m.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')), 0) AS month_used_tokens,
        COALESCE((SELECT SUM(total_tokens) FROM ai_messages m WHERE m.user_id = u.user_no), 0) AS total_used_tokens,
        (SELECT MAX(created_at) FROM ai_messages m WHERE m.user_id = u.user_no) AS recent_message_at
       FROM users u
       ORDER BY u.user_no DESC`
    );

    const mappedUsers = users.map((user) => {
      const effectiveStatus = buildEffectiveStatus({
        globalEnabled,
        userEnabled: Number(user.ai_enabled) === 1,
        platformStatus: platform.status,
      });
      return {
        ...user,
        effectiveStatus,
      };
    });

    res.json({
      settings: {
        ai_enabled: globalEnabled,
        ai_default_model: defaultModel,
        ai_default_daily_token_limit: Number(defaultDailyRaw || 0),
        ai_default_monthly_token_limit: Number(defaultMonthlyRaw || 0),
        ai_request_token_limit: Number(requestLimitRaw || 0),
      },
      platform,
      users: mappedUsers,
    });
  } catch (err) {
    console.error("[AI ADMIN] GET /overview error:", err);
    res.status(500).json({ message: "AI 관리 개요를 불러오지 못했습니다." });
  }
});

router.patch("/settings", verifyAdmin, async (req, res) => {
  const { ai_enabled, default_daily_limit, default_monthly_limit, apply_to_all_users } = req.body || {};
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await setSetting(connection, "ai_enabled", Number(Boolean(ai_enabled)));
    await setSetting(connection, "ai_default_daily_token_limit", Number(default_daily_limit || 0));
    await setSetting(connection, "ai_default_monthly_token_limit", Number(default_monthly_limit || 0));

    if (apply_to_all_users) {
      await connection.query(
        `UPDATE users
         SET ai_daily_token_limit = ?,
             ai_monthly_token_limit = ?`,
        [Number(default_daily_limit || 0), Number(default_monthly_limit || 0)]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error("[AI ADMIN] PATCH /settings error:", err);
    res.status(500).json({ message: "AI 전역 설정을 저장하지 못했습니다." });
  } finally {
    connection.release();
  }
});

router.patch("/users/:userId", verifyAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const { ai_enabled, ai_daily_token_limit, ai_monthly_token_limit } = req.body || {};

  try {
    await db.query(
      `UPDATE users
       SET ai_enabled = ?,
           ai_daily_token_limit = ?,
           ai_monthly_token_limit = ?
       WHERE user_no = ?`,
      [
        Number(Boolean(ai_enabled)),
        Number(ai_daily_token_limit || 0),
        Number(ai_monthly_token_limit || 0),
        userId,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("[AI ADMIN] PATCH /users/:userId error:", err);
    res.status(500).json({ message: "사용자 AI 설정을 저장하지 못했습니다." });
  }
});

router.get("/users/:userId/logs", verifyAdmin, async (req, res) => {
  const userId = Number(req.params.userId);

  try {
    const [[user]] = await db.query(
      `SELECT user_no AS user_id, id AS login_id, nickname
       FROM users
       WHERE user_no = ?
       LIMIT 1`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const [files] = await db.query(
      `SELECT id, original_name, bytes, openai_status, created_at
       FROM ai_uploaded_files
       WHERE uploader_user_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [userId]
    );

    const [conversations] = await db.query(
      `SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        (SELECT m.content FROM ai_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_preview
       FROM ai_conversations c
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC, c.id DESC`,
      [userId]
    );

    const [messages] = await db.query(
      `SELECT
        id,
        conversation_id,
        role,
        content,
        created_at,
        total_tokens
       FROM ai_messages
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    );

    const messagesByConversation = messages.reduce((acc, row) => {
      const key = String(row.conversation_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});

    res.json({
      user,
      files,
      conversations,
      messagesByConversation,
    });
  } catch (err) {
    console.error("[AI ADMIN] GET /users/:userId/logs error:", err);
    res.status(500).json({ message: "사용자 AI 로그를 불러오지 못했습니다." });
  }
});

module.exports = router;

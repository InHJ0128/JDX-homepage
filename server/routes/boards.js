// routes/boards.js
// 다목적 게시판: 목록/검색, 단건, 생성, 수정, 삭제
// - 로그인 사용자 누구나 생성
// - 작성자/관리자만 수정/삭제
// - 태그는 자유 생성 + 다중 AND 검색
// - 코드 입력은 제거(생성 시 code=null, language='text'로 기본값)

const express = require('express');
const router = express.Router();
const db = require('../db');

// ------------------------
// 유틸: 로그인/권한
// ------------------------
function getAuthedUser(req) {
  return req.user || (req.session ? req.session.user : null);
}

function requireLogin(req, res, next) {
  const user = getAuthedUser(req);
  if (user) {
    req.user = user;
    return next();
  }
  return res.status(401).json({ message: '로그인이 필요합니다.' });
}

function isAdminUser(user) {
  return user && (user.is_admin === 1 || user.is_admin === true);
}

// ------------------------
// 유틸: 유저ID 숫자화
// ------------------------

async function resolveNumericUserId(user) {
  // 1) 숫자면 그대로
  const tryNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  let uid = tryNum(user?.id) || tryNum(user?.user_id);
  if (uid) return uid;

  // 2) 문자열 계정명을 통한 조회 (users 테이블의 컬럼명 시도)
  //    프로젝트에 맞게 account/username/email 중 실제 쓰는 걸 남겨두세요.
  const candidates = [];
  if (user?.account) candidates.push(['account', user.account]);
  if (user?.username) candidates.push(['username', user.username]);
  if (user?.email) candidates.push(['email', user.email]);
  if (typeof user === 'string') candidates.push(['account', user]); // 혹시 통째로 계정명만 저장됐다면

  for (const [col, val] of candidates) {
    const [rows] = await db.query(`SELECT id FROM users WHERE ${col}=? LIMIT 1`, [val]);
    if (rows[0]?.id) return Number(rows[0].id);
  }

  // 3) 마지막 시도: nickname
  if (user?.nickname) {
    const [rows] = await db.query(`SELECT id FROM users WHERE nickname=? LIMIT 1`, [user.nickname]);
    if (rows[0]?.id) return Number(rows[0].id);
  }

  throw new Error('cannot resolve numeric user id');
}

// ------------------------
// 유틸: 태그 upsert
// ------------------------
async function upsertTags(conn, tagNames) {
  if (!Array.isArray(tagNames) || tagNames.length === 0) return [];
  const names = [...new Set(tagNames.map((n) => String(n).trim()).filter(Boolean))];
  const ids = [];
  for (const name of names) {
    try {
      const [r] = await conn.query('INSERT INTO tags (name) VALUES (?)', [name]);
      ids.push(r.insertId);
    } catch (e) {
      const [rows] = await conn.query('SELECT id FROM tags WHERE name=?', [name]);
      if (rows[0]) ids.push(rows[0].id);
    }
  }
  return ids;
}

// ------------------------
// 목록 + 검색 (?q=, ?tags=a,b,c)
// - q: 제목/본문(한/일) LIKE 검색
// - tags: AND 매칭(모두 포함하는 글만)
// ------------------------
router.get('/', async (req, res) => {
  const { q, tags } = req.query;
  const tagList = typeof tags === 'string' && tags.length ? tags.split(',').map(s => s.trim()).filter(Boolean) : [];

  // 기본 SELECT
  let base = `
    SELECT b.*,
           GROUP_CONCAT(t.name ORDER BY t.name) AS tag_names
    FROM boards b
    LEFT JOIN board_tags bt ON bt.board_id = b.id
    LEFT JOIN tags t ON t.id = bt.tag_id
  `;

  const params = [];
  const wheres = [];

  if (q) {
    // 안전한 LIKE 검색 (FULLTEXT 미구현 환경 호환)
    wheres.push(`(
      CONCAT_WS(' ', b.title_ko, b.title_ja, b.body_ko, b.body_ja) LIKE ?
    )`);
    params.push(`%${q}%`);
  }

  // 태그 AND 필터
  if (tagList.length) {
    base += `
      JOIN (
        SELECT bt.board_id
        FROM board_tags bt
        JOIN tags t ON t.id = bt.tag_id
        WHERE t.name IN (${tagList.map(() => '?').join(',')})
        GROUP BY bt.board_id
        HAVING COUNT(DISTINCT t.name) = ?
      ) flt ON flt.board_id = b.id
    `;
    params.push(...tagList, tagList.length);
  }

  const sql = `
    ${base}
    ${wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''}
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT 100
  `;

  const [rows] = await db.query(sql, params);
  return res.json(rows);
});

// ------------------------
// 단건 조회
// ------------------------
router.get('/:id', async (req, res) => {
  const boardId = req.params.id;
  // 혹시 /boards/new 같은 경로가 들어오면 404
  if (boardId === 'new') return res.status(404).json({ message: 'not found' });

  const [rows] = await db.query(`
    SELECT b.*,
           GROUP_CONCAT(t.name ORDER BY t.name) AS tag_names
    FROM boards b
    LEFT JOIN board_tags bt ON bt.board_id = b.id
    LEFT JOIN tags t ON t.id = bt.tag_id
    WHERE b.id = ?
    GROUP BY b.id
  `, [boardId]);

  if (!rows[0]) return res.status(404).json({ message: 'not found' });
  return res.json(rows[0]);
});

// ------------------------
// 생성 (로그인 필요)
// - 코드 입력 제거 → code=null, language='text'로 기본값
// ------------------------
// POST /api/boards
router.post('/', requireLogin, async (req, res) => {
  try {
    const user = getAuthedUser(req);
    const userId = await resolveNumericUserId(user); // ✅ 숫자화

    const { title_ko, title_ja, body_ko, body_ja, is_hidden, tags } = req.body || {};
    if (!title_ko || !title_ja || !body_ko || !body_ja) {
      return res.status(400).json({ message: 'missing fields' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const code = null, language = 'text';
      const [r] = await conn.query(
        `INSERT INTO boards (user_id, title_ko, title_ja, body_ko, body_ja, code, language, is_hidden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title_ko, title_ja, body_ko, body_ja, code, language, is_hidden ? 1 : 0]
      );
      const boardId = r.insertId;

      const tagIds = await upsertTags(conn, Array.isArray(tags) ? tags : []);
      for (const tid of tagIds) {
        await conn.query('INSERT IGNORE INTO board_tags (board_id, tag_id) VALUES (?,?)', [boardId, tid]);
      }

      await conn.commit();
      return res.status(201).json({ id: boardId });
    } catch (e) {
      await conn.rollback();
      console.error('[POST /api/boards] error:', e);
      return res.status(500).json({ message: 'save failed', code: e.code, sqlMessage: e.sqlMessage });
    } finally {
      conn.release();
    }
  } catch (e) {
    // 세션에 숫자 ID를 못 찾은 경우
    return res.status(401).json({ message: 'bad session: cannot resolve user id' });
  }
});



// ------------------------
// 수정 (작성자 또는 관리자)
// - 코드/언어는 유지(폼에서 제거했으므로)
// ------------------------
router.put('/:id', requireLogin, async (req, res) => {
  const user = getAuthedUser(req);
  const id = Number(req.params.id);

  // ✅ body에서 안전하게 구조분해 (스코프 명확)
  const {
    title_ko = '',
    title_ja = '',
    body_ko = '',
    body_ja = '',
    is_hidden = 0,
    tags = []
  } = req.body || {};

  // 기본 검증
  if (!title_ko.trim() || !title_ja.trim() || !body_ko.trim() || !body_ja.trim()) {
    return res.status(400).json({ message: 'missing fields' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 대상 글 존재 여부 + 소유자 확인
    const [rows] = await conn.query('SELECT user_id FROM boards WHERE id=?', [id]);
    if (!rows[0]) {
      await conn.rollback();
      return res.status(404).json({ message: 'not found' });
    }
    const ownerId = Number(rows[0].user_id);

    // 요청자 숫자 ID 해석
    let requesterId = Number(user?.id);
    if (!Number.isInteger(requesterId) || requesterId <= 0) {
      if (user?.account) {
        const [u] = await conn.query('SELECT user_no FROM users WHERE id=? LIMIT 1', [user.account]);
        if (u[0]?.user_no) requesterId = Number(u[0].user_no);
      }
    }

    const admin = isAdminUser(user);
    if (!(admin || requesterId === ownerId)) {
      await conn.rollback();
      return res.status(403).json({ message: '권한 없음' });
    }

    // 글 업데이트
    await conn.query(
      `UPDATE boards
         SET title_ko=?, title_ja=?, body_ko=?, body_ja=?, is_hidden=?
       WHERE id=?`,
      [title_ko, title_ja, body_ko, body_ja, is_hidden ? 1 : 0, id]
    );

    // 태그 재설정
    await conn.query('DELETE FROM board_tags WHERE board_id=?', [id]);
    const tagIds = await upsertTags(conn, Array.isArray(tags) ? tags : []);
    for (const tid of tagIds) {
      await conn.query('INSERT IGNORE INTO board_tags (board_id, tag_id) VALUES (?,?)', [id, tid]);
    }

    await conn.commit();
    return res.json({ ok: true });
  } catch (e) {
    try { await conn?.rollback(); } catch {}
    console.error('[PUT /api/boards/:id] error:', e);
    return res.status(500).json({
      message: 'update failed',
      code: e.code,
      sqlMessage: e.sqlMessage
    });
  } finally {
    conn?.release?.();
  }
});

// ------------------------
// 삭제 (작성자 또는 관리자)
// ------------------------
// DELETE /api/boards/:id (동일)
router.delete('/:id', requireLogin, async (req, res) => {
  const id = req.params.id;
  const user = getAuthedUser(req);
  let requesterId;
  try {
    requesterId = await resolveNumericUserId(user);  // ✅ 숫자화
  } catch {
    return res.status(401).json({ message: 'bad session: cannot resolve user id' });
  }

  const [rows] = await db.query('SELECT user_id FROM boards WHERE id=?', [id]);
  if (!rows[0]) return res.status(404).json({ message: 'not found' });

  const ownerId = Number(rows[0].user_id);
  const admin = isAdminUser(user);
  if (!(admin || requesterId === ownerId)) {
    return res.status(403).json({ message: '권한 없음' });
  }
  await db.query('DELETE FROM boards WHERE id=?', [id]);
  return res.json({ ok: true });
});


module.exports = router;

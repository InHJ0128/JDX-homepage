// routes/comments.js
const express = require('express');
const bcrypt = require('bcryptjs'); // 게스트 비번 해시
const router = express.Router();
const db = require('../db');

// 세션/유저 헬퍼
function getAuthedUser(req) {
  return req.user || (req.session ? req.session.user : null);
}

async function resolveNumericUserId(user) {
  // 세션에 숫자면 그대로
  const n = Number(user?.id);
  if (Number.isInteger(n) && n > 0) return n;

  // 계정명으로 조회 (users.id = 로그인아이디, users.user_no = 숫자PK)
  if (user?.account) {
    const [rows] = await db.query('SELECT user_no FROM users WHERE id=? LIMIT 1', [user.account]);
    if (rows[0]?.user_no) return Number(rows[0].user_no);
  }
  return null;
}

// 댓글 목록 (작성자 닉네임 포함)
router.get('/:boardId', async (req, res) => {
  const boardId = req.params.boardId;
  const [rows] = await db.query(
    `SELECT c.id, c.board_id, c.user_id, c.guest_name, c.body, c.created_at,
            u.nickname AS user_nickname
     FROM comments c
     LEFT JOIN users u ON u.user_no = c.user_id
     WHERE c.board_id = ?
     ORDER BY c.id ASC`,
    [boardId]
  );
  return res.json(rows);
});

// 댓글 생성: 로그인/비로그인 모두 허용
router.post('/:boardId', async (req, res) => {
  const boardId = req.params.boardId;
  const { body, guest_name, guest_password } = req.body || {};

  if (!body || !String(body).trim()) {
    return res.status(400).json({ message: '내용이 비어 있습니다.' });
  }

  const user = getAuthedUser(req);
  let userId = null;

  // 로그인 상태라면 user_id 채우기
  if (user) {
    userId = await resolveNumericUserId(user);
  }

  try {
    if (userId) {
      // 로그인 사용자 댓글
      await db.query(
        `INSERT INTO comments (board_id, user_id, guest_name, guest_pw_hash, body)
         VALUES (?, ?, NULL, NULL, ?)`,
        [boardId, userId, body]
      );
    } else {
      // 게스트 댓글: 비번 필요
      if (!guest_password) {
        return res.status(400).json({ message: '게스트 비밀번호가 필요합니다.' });
      }
      const hash = await bcrypt.hash(String(guest_password), 10);
      await db.query(
        `INSERT INTO comments (board_id, user_id, guest_name, guest_pw_hash, body)
         VALUES (?, NULL, ?, ?, ?)`,
        [boardId, guest_name || null, hash, body]
      );
    }
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error('[POST /api/comments/:boardId] error:', e);
    return res.status(500).json({ message: 'save failed' });
  }
});

// 댓글 삭제: 로그인(본인/관리자) 또는 게스트(비번 확인)
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const user = getAuthedUser(req);

  try {
    const [rows] = await db.query(
      'SELECT user_id, guest_pw_hash FROM comments WHERE id=?',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'not found' });

    const c = rows[0];
    const isAdmin = user?.is_admin === 1 || user?.is_admin === true;

    if (c.user_id) {
      // 로그인 댓글: 본인 또는 관리자만
      const uid = await resolveNumericUserId(user);
      if (!(isAdmin || (uid && Number(uid) === Number(c.user_id)))) {
        return res.status(403).json({ message: '권한 없음' });
      }
    } else {
      // ✅ 게스트 댓글: "관리자면 비번 없이" 삭제 허용
      if (!isAdmin) {
        const { guest_password } = req.body || {};
        if (!guest_password || !c.guest_pw_hash) {
          return res.status(401).json({ message: 'password required' });
        }
        const ok = await bcrypt.compare(String(guest_password), c.guest_pw_hash);
        if (!ok) return res.status(401).json({ message: 'password mismatch' });
      }
    }

    await db.query('DELETE FROM comments WHERE id=?', [id]);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/comments/:id] error:', e);
    return res.status(500).json({ message: 'delete failed' });
  }
});

module.exports = router;

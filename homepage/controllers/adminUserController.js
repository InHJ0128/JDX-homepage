// user/adminController.js
const db = require('../db');
const bcrypt = require('bcrypt');

// 사용자 목록 조회
exports.listUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nickname, is_admin FROM users');
    res.json(rows);
  } catch (err) {
    console.error('사용자 목록 조회 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 사용자 추가
exports.createUser = async (req, res) => {
  const { nickname, is_admin } = req.body;
  if (!nickname) return res.status(400).json({ message: '필수 항목 누락' });
  try {
    const hashed = await bcrypt.hash(nickname, 10);
    await db.query(
      'INSERT INTO users (id, password, nickname, is_admin, is_initialized) VALUES (?, ?, ?, ?, false)',
      [nickname, hashed, nickname, is_admin ? 1 : 0]
    );
    res.status(201).json({ message: '사용자 추가 완료' });
  } catch (err) {
    console.error('사용자 추가 오류:', err);
    res.status(500).json({ message: '서버 오류 또는 ID 중복' });
  }
};

// 관리자 권한 토글
exports.toggleAdmin = async (req, res) => {
  const id = req.params.id;
  const flag = req.body.isAdmin;
  try {
    await db.query('UPDATE users SET is_admin = ? WHERE id = ?', [flag ? 1 : 0, id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('관리자 권한 토글 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 사용자 삭제
exports.deleteUser = async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('사용자 삭제 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};


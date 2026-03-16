// user/adminController.js
const db = require('../db');
const bcrypt = require('bcrypt');

// 사용자 목록 조회
exports.listUsers = async (req, res) => {
  try {
    // ✅ (수정 포인트) 새로 추가한 name, student_id, department, grade, phone, admin_memo까지 싹 다 가져옵니다.
    const query = `
      SELECT 
        id, student_id, name, nickname, department, 
        grade, phone, status, is_admin, admin_memo 
      FROM users
      ORDER BY 
        CASE WHEN id = 'admin' THEN 1 ELSE 2 END,
        is_admin DESC, 
        id ASC
    `;
    
    // DB 연결 방식에 맞게 수정 (아래는 mysql2/promise 기준 예시입니다)
    const [users] = await db.query(query);
    
    res.json(users);
  } catch (err) {
    console.error('유저 목록 불러오기 실패:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 사용자 추가
exports.createUser = async (req, res) => {
  // ✅ req.body에서 is_admin을 받아옵니다.
  const { id, password, nickname, name, student_id, department, grade, phone, is_admin } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: '이미 존재하는 학번(아이디)입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ✅ 프론트에서 true/false로 보낸 값을 DB용 1/0으로 변환
    const adminVal = is_admin ? 1 : 0; 

    const query = `
      INSERT INTO users 
      (id, password, nickname, name, student_id, department, grade, phone, is_admin) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `; // 마지막을 0 대신 ?로 변경!
    
    await db.query(query, [
      id, 
      hashedPassword, 
      nickname, 
      name || null, 
      student_id || id, 
      department || null, 
      grade || null, 
      phone || null,
      adminVal // ✅ 변환한 권한 값 넣기
    ]);

    res.status(201).json({ message: '계정이 성공적으로 생성되었습니다.' });
  } catch (err) {
    console.error('계정 생성 중 오류:', err);
    res.status(500).json({ message: '서버 오류로 계정을 생성하지 못했습니다.' });
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

exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['enrolled', 'alumni'].includes(status)) {
    return res.status(400).json({ message: "잘못된 상태 값입니다." });
  }

  try {
    const db = require("../db"); // DB 연결 객체 경로에 맞게 확인
    await db.query("UPDATE users SET status = ? WHERE id = ?", [status, id]);
    res.json({ message: "상태 변경 완료" });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

//신규유저 생성
exports.createUser = async (req, res) => {
  const { id, password, nickname, name, student_id, department, grade, phone } = req.body;

  try {
    // 1. 중복 아이디(학번) 검사
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: '이미 존재하는 학번(아이디)입니다.' });
    }

    // 2. 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. DB에 유저 정보 삽입
    const query = `
      INSERT INTO users 
      (id, password, nickname, name, student_id, department, grade, phone, is_admin) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;
    
    await db.query(query, [
      id, 
      hashedPassword, 
      nickname, 
      name || null, 
      student_id || id, // 학번이 안 넘어오면 id를 학번으로 저장
      department || null, 
      grade || null, 
      phone || null
    ]);

    res.status(201).json({ message: '계정이 성공적으로 생성되었습니다.' });
  } catch (err) {
    console.error('계정 생성 중 오류:', err);
    res.status(500).json({ message: '서버 오류로 계정을 생성하지 못했습니다.' });
  }
};

// 관리자용: 유저 상세 정보 전체 업데이트
exports.updateUserDetail = async (req, res) => {
  const originalId = req.params.id; // 기존 ID
  // body에서 새로 바뀐 id도 받아옵니다.
  const { id: newId, student_id, name, nickname, department, grade, status, phone, is_admin, admin_memo } = req.body;

  if (originalId === 'admin') return res.status(403).json({ message: '최고 관리자는 수정할 수 없습니다.' });

  try {
    // 만약 ID를 바꿨다면, 바꾸려는 ID가 이미 존재하는지 중복 검사
    if (originalId !== newId) {
      const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [newId]);
      if (existing.length > 0) {
        return res.status(400).json({ message: '이미 존재하는 ID(학번)로 변경할 수 없습니다.' });
      }
    }

    const query = `
      UPDATE users 
      SET id=?, student_id=?, name=?, nickname=?, department=?, grade=?, status=?, phone=?, is_admin=?, admin_memo=?
      WHERE id=?
    `;
    
    // 배열 순서 주의: 제일 마지막에 원래 ID(originalId)가 들어갑니다.
    await db.query(query, [newId, student_id, name, nickname, department, grade, status, phone, is_admin, admin_memo, originalId]);
    
    res.json({ message: '유저 정보가 수정되었습니다.' });
  } catch (err) {
    console.error(err);
    // 🚨 중요: 만약 여기서 Foreign Key 제약 조건 에러가 난다면,
    // 해당 유저가 쓴 게시글 등이 있어서 DB가 변경을 막은 것입니다.
    res.status(500).json({ message: '수정 실패 (다른 데이터와 연결된 ID일 수 있습니다)' });
  }
};

// 관리자용: 비밀번호 초기화 (초기 비번은 '1234'로 세팅)
exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  if (id === 'admin') return res.status(403).json({ message: '최고 관리자는 초기화할 수 없습니다.' });

  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('1234', 10); // 기본 비밀번호 1234
    await db.query('UPDATE users SET password=? WHERE id=?', [hashedPassword, id]);
    res.json({ message: '비밀번호가 1234로 초기화되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '초기화 실패' });
  }
};
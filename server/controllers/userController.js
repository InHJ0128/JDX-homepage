const db = require("../db");
const bcrypt = require("bcrypt");

exports.updatePassword = async (req, res) => {
  const { id, password } = req.body;
  console.log("[updatePassword] 요청 도착", req.body);
  
  if (!id || !password) return res.status(400).json({ message: "입력 누락" });
  
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hash, id]);
    res.status(200).json({ message: "비밀번호 변경 완료" });
  } catch (err) {
    res.status(500).json({ message: "서버 오류" });
    console.error("[updatePassword] 에러 발생:", err);
  }
  
};

exports.updateNickname = async (req, res) => {
  const { id, nickname } = req.body;
  if (!id || !nickname) return res.status(400).json({ message: "입력 누락" });

  try {
    await db.query("UPDATE users SET nickname = ? WHERE id = ?", [nickname, id]);
    res.status(200).json({ message: "닉네임 변경 완료" });
  } catch (err) {
    res.status(500).json({ message: "서버 오류" });
  }
};

exports.initSetup = async (req, res) => {
  const { userId, password, nickname, originalUserId } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    await db.query(
      "UPDATE users SET id = ?, password = ?, nickname = ?, is_initialized = true WHERE id = ?",
      [userId, hashed,nickname, originalUserId]
    );
    res.json({ message: "설정 완료" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
};

// ✅ 내 정보 불러오기 (새로 추가)
exports.getMyInfo = async (req, res) => {
  const { id } = req.query; // GET 요청이므로 query에서 id를 꺼냅니다
  if (!id) return res.status(400).json({ message: "ID가 필요합니다." });

  try {
    const query = `
      SELECT id, student_id, name, nickname, department, grade, phone 
      FROM users 
      WHERE id = ?
    `;
    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "유저 정보를 찾을 수 없습니다." });
    }
    res.json(rows[0]); // 프론트엔드로 정보 쏘기
  } catch (err) {
    console.error("내 정보 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

// ✅ 내 정보 전체 수정하기 (새로 추가)
exports.updateMyInfo = async (req, res) => {
  const { id, nickname, name, department, grade, phone } = req.body;
  if (!id) return res.status(400).json({ message: "ID가 필요합니다." });

  try {
    const query = `
      UPDATE users 
      SET nickname=?, name=?, department=?, grade=?, phone=? 
      WHERE id=?
    `;
    await db.query(query, [nickname, name, department, grade, phone, id]);

    res.json({ message: "정보가 성공적으로 수정되었습니다." });
  } catch (err) {
    console.error("내 정보 수정 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};
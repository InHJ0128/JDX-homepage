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

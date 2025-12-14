const express = require("express");
const router = express.Router();
const db = require("../db");
// 프로젝트에 이미 설치된 걸 쓰세요: bcrypt 또는 bcryptjs
// const bcrypt = require("bcryptjs");
const bcrypt = require("bcrypt");

/** 사용자 레코드에서 "숫자 PK"를 찾아내는 유틸
 *  - 테이블 설계가 프로젝트별로 달라서, 자주 쓰는 후보 컬럼들을 순서대로 검사합니다.
 *  - 예: idx, user_id, uid, no, pk, (마지막으로) id가 숫자면 그것도 허용
 */
function pickNumericUserId(userRow) {
  const candidates = ["idx", "user_id", "uid", "no", "pk", "ID", "userNo", "userIdx"];
  for (const key of candidates) {
    if (userRow && userRow[key] != null) {
      const n = Number(userRow[key]);
      if (Number.isInteger(n) && n > 0) return n;
    }
  }
  // 마지막 시도: id 자체가 숫자면 허용
  const nFromId = Number(userRow?.id);
  if (Number.isInteger(nFromId) && nFromId > 0) return nFromId;
  return null;
}

// 로그인 API
router.post("/login", async (req, res) => {
  const { id, password } = req.body;
  console.log("[AUTH] /login payload:", req.body);
  if (!id || !password) {
    return res.status(400).json({ message: "아이디 또는 비밀번호 누락" });
  }

  try {
    // ⚠️ 현재 스키마가 'id' 컬럼에 로그인 아이디(예: 'admin')를 저장하는 방식이면 아래 쿼리가 맞습니다.
    // 만약 로그인 아이디 컬럼명이 'account'/'username'이라면 해당 컬럼으로 바꿔주세요.
    const [rows] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    const user = rows[0];
    console.log("[AUTH] DB rows:", rows);

    if (!user) {
      return res.status(401).json({ message: "존재하지 않는 사용자입니다." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("[AUTH] password compare result:", isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    // 최초 설정 필요 사용자
    if (!user.is_initialized) {
      return res.json({ message: "초기 설정 필요", needInit: true, id: user.id });
    }

    // ✅ 숫자 PK 확보 (boards.user_id에 들어갈 값)
    const numericId = pickNumericUserId(user);
    if (!numericId) {
      // 숫자 PK를 찾지 못하면, 이후 글쓰기에서 401로 명확히 실패하도록 안내
      console.warn("[AUTH] cannot resolve numeric user id from row keys:", Object.keys(user));
    }

    // 로그인 성공 → 세션에 '숫자 PK'와 '로그인 아이디(문자열)'를 함께 저장
    // 로그인 성공 후 (기존 user는 SELECT * FROM users WHERE id=? 결과)
    req.session.user = {
      id: Number(user.user_no) || undefined,  // ✅ 숫자 PK (중요!)
      account: String(user.id),               // 'admin' 같은 로그인 아이디는 보조
      is_admin: user.is_admin ? 1 : 0,
      nickname: user.nickname ?? null,
    };

    console.log("[AUTH] session set:", req.session.user);

    req.session.save((err) => {
      if (err) {
        console.error("[AUTH] session save error:", err);
        return res.status(500).json({ message: "세션 저장 중 오류가 발생했습니다." });
      }

      // 클라이언트로는 안전한 사용자 정보만 전달(비밀번호 제외)
      const { password: _pw, ...safeUser } = user;
      res.status(200).json({ user: safeUser });
    });
  } catch (err) {
    console.error("[AUTH] login error:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 로그아웃
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("세션 파괴 실패:", err);
      return res.status(500).json({ message: "로그아웃에 실패했습니다." });
    }
    res.clearCookie("connect.sid");
    return res.json({ success: true });
  });
});

module.exports = router;

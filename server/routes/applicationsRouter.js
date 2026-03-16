// routes/applicationsRouter.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const axios = require("axios");

function normalizeLangs(langs) {
  // 배열/문자열 둘 다 허용
  if (Array.isArray(langs)) return langs.map(String);
  if (typeof langs === "string") return langs.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

async function notifyDiscord(appRow) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  
  // 💡 디버깅용 로그: URL을 잘 불러오는지 터미널에 출력해봅니다.
  console.log("[디스코드] 웹훅 URL 확인:", url ? "URL 있음" : "URL 없음(undefined)");

  if (!url) {
    console.log("[디스코드] 환경변수에 URL이 없어서 전송을 취소합니다.");
    return;
  }

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "여기에_관리자_역할_ID_입력";

  const payload = {
    content: `<@&${adminRoleId}> 🚨 **새로운 동아리 지원서가 도착했습니다!**`,
    embeds: [
      {
        title: `📝 ${appRow.name} (${appRow.student_id})님의 지원서`,
        color: 0x3498db,
        fields: [
          { name: "학과 / 학년", value: `${appRow.department} / ${appRow.grade}학년`, inline: true },
          { name: "연락처", value: appRow.phone, inline: true },
          { 
            name: "희망 언어/분야", 
            value: appRow.desired_languages + (appRow.desired_other ? ` (${appRow.desired_other})` : ""), 
            inline: false 
          },
          { name: "프로그래밍 경험", value: appRow.experience || "(입력 안 함)", inline: false }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  await axios.post(url, payload);
}

router.post("/", async (req, res) => {
  try {
    const {
      student_id,
      name,
      grade,
      department,
      phone,
      experience = "",
      desired_languages,
      desired_other = "",
    } = req.body;

    // 최소 검증
    if (!student_id || !name || !grade || !department || !phone) {
      return res.status(400).json({ message: "필수 항목 누락" });
    }

    const langs = normalizeLangs(desired_languages);
    if (langs.length === 0) return res.status(400).json({ message: "배우고 싶은 언어 선택 필요" });

    const desiredLangStr = langs.join(",");

    await db.query(
      `INSERT INTO club_applications
       (student_id, name, grade, department, phone, experience, desired_languages, desired_other)
       VALUES (?,?,?,?,?,?,?,?)`,
      [student_id, name, grade, department, phone, experience, desiredLangStr, desired_other]
    );

    // (선택) 디스코드 알림
    notifyDiscord({
      student_id, name, grade, department, phone, experience,
      desired_languages: desiredLangStr, desired_other
    }).catch((e) => {
      console.error("[디스코드 전송 실패]:", e.response ? e.response.data : e.message);
    });

    res.json({ success: true });
  } catch (e) {
    console.error("application submit error:", e);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;

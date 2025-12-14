const express = require("express");
const router = express.Router();
const db = require("../db");

const { updatePassword, updateNickname, initSetup } = require("../controllers/userController");
const { listActivities, getActivities } = require("../controllers/activityController");
const { listWorks, getWorks } = require("../controllers/workController");
const { listHighlightsForUser } = require("../controllers/adminHomeController");


// 비밀번호 변경
router.post("/password", updatePassword);

// 닉네임 변경
router.post("/nickname", updateNickname);

//최초 설정
router.post("/init", initSetup);

//동아리 활동 불러오기
router.get("/activities", listActivities);
router.get("/activities/:id", getActivities);

//작품 불러오기
router.get("/work", listWorks);
router.get("/work/:id", getWorks);

//메인 사진 설정
router.get("/home-highlights", listHighlightsForUser);

//하단 네비게이션 불러오기
router.get("/footer-nav", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM footer_nav WHERE hidden=0 ORDER BY order_index ASC");
  res.json(rows);
});

module.exports = router;

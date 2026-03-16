const db = require("../db");

// 작품 목록 (유저 전용)
exports.listWorks = async (req, res) => {
  try {
    const lang = req.query.lang === "ja" ? "ja" : "ko";
    const titleCol = lang === "ja" ? "title_ja" : "title";
    const contentCol = lang === "ja" ? "content_ja" : "content";

    const [rows] = await db.query(`
      SELECT id, ${titleCol} AS title, ${contentCol} AS content,
             thumbnail_url, created_at
      FROM works
      WHERE hidden = 0
      ORDER BY emphasized DESC, created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("작품 목록 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

// 작품 단건 조회
exports.getWorks = async (req, res) => {
  const { id } = req.params;
  try {
    const lang = req.query.lang === "ja" ? "ja" : "ko";
    const titleCol = lang === "ja" ? "title_ja" : "title";
    const contentCol = lang === "ja" ? "content_ja" : "content";

    const [[row]] = await db.query(`
      SELECT id, ${titleCol} AS title, ${contentCol} AS content,
             image_url, thumbnail_url, created_at
      FROM works
      WHERE id = ? AND hidden = 0
    `, [id]);

    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("작품 단건 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

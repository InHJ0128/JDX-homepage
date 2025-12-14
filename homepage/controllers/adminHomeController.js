// controllers/adminHomeController.js
const db = require('../db');


exports.listHighlights = async (req, res) => {
  const [rows] = await db.query(
    `SELECT h.id, h.target_type, h.target_id, h.order_index,
            CASE WHEN h.target_type='activity' THEN a.title ELSE w.title END AS title,
            CASE WHEN h.target_type='activity' THEN a.thumbnail_url ELSE w.thumbnail_url END AS thumbnail_url
     FROM home_highlights h
     LEFT JOIN activities a ON h.target_type='activity' AND h.target_id=a.id
     LEFT JOIN works w ON h.target_type='work' AND h.target_id=w.id
     ORDER BY h.order_index ASC`
  );
  res.json(rows);
};

exports.addHighlight = async (req, res) => {
  const { target_type, target_id } = req.body;
  await db.query(
    "INSERT INTO home_highlights (target_type, target_id) VALUES (?, ?)",
    [target_type, target_id]
  );
  res.json({ success: true });
};

exports.deleteHighlight = async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM home_highlights WHERE id=?", [id]);
  res.json({ success: true });
};

exports.orderHighlight = async (req, res) => {
  const { orderedIds } = req.body; // [3,1,2] 이런 식
  for (let i = 0; i < orderedIds.length; i++) {
    await db.query("UPDATE home_highlights SET order_index=? WHERE id=?", [i, orderedIds[i]]);
  }
  res.json({ success: true });
};

exports.listHighlightsForUser = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT h.id, h.target_type, h.target_id, h.order_index,
             CASE WHEN h.target_type='activity' THEN a.title ELSE w.title END AS title_ko,
             CASE WHEN h.target_type='activity' THEN a.title_ja ELSE w.title_ja END AS title_ja,
             CASE WHEN h.target_type='activity' THEN a.image_url ELSE w.image_url END AS image_url
      FROM home_highlights h
      LEFT JOIN activities a ON h.target_type='activity' AND h.target_id=a.id
      LEFT JOIN works w ON h.target_type='work' AND h.target_id=w.id
      ORDER BY h.order_index ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("홈 하이라이트 조회 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};
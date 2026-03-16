// routes/controllers/adminApplicationController.js
const db = require("../db");

exports.listApplications = async (req, res) => {
  try {
    const { status, unread } = req.query; // status=new 등, unread=1
    const where = [];
    const params = [];

    if (status) { where.push("status = ?"); params.push(status); }
    if (unread === "1") { where.push("is_read = 0"); }

    const sql = `
      SELECT *
      FROM club_applications
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC
      LIMIT 500
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error("listApplications error:", e);
    res.status(500).json({ message: "서버 오류" });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const [[row]] = await db.query(
      "SELECT COUNT(*) AS cnt FROM club_applications WHERE is_read = 0"
    );
    res.json({ count: row?.cnt || 0 });
  } catch (e) {
    console.error("unreadCount error:", e);
    res.status(500).json({ message: "서버 오류" });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE club_applications SET is_read = 1 WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (e) {
    console.error("markRead error:", e);
    res.status(500).json({ message: "서버 오류" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // new/reviewing/accepted/rejected
    if (!["new","reviewing","accepted","rejected"].includes(status)) {
      return res.status(400).json({ message: "invalid status" });
    }
    await db.query("UPDATE club_applications SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true });
  } catch (e) {
    console.error("updateStatus error:", e);
    res.status(500).json({ message: "서버 오류" });
  }
};

// 지원서 삭제 (하드 삭제)
exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM club_applications WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteApplication error:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

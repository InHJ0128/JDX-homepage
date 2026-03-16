// controllers/adminFooterController.js
const db = require("../db");

exports.listFooterNav = async (req, res) => {
  const [rows] = await db.query("SELECT * FROM footer_nav ORDER BY order_index ASC");
  res.json(rows);
};

exports.addFooterNav = async (req, res) => {
  const { label_ko, label_ja, url } = req.body;
  await db.query("INSERT INTO footer_nav (label_ko, label_ja, url) VALUES (?,?,?)",
    [label_ko, label_ja, url]);
  res.json({ success: true });
};

exports.updateFooterNav = async (req, res) => {
  const { id } = req.params;
  const { label_ko, label_ja, url, hidden } = req.body;
  const hiddenValue = hidden ?? 0;
  await db.query(
    "UPDATE footer_nav SET label_ko=?, label_ja=?, url=?, hidden=? WHERE id=?",
    [label_ko, label_ja, url, hiddenValue, id]
  );
  res.json({ success: true });
};

exports.updateFooterOrder = async (req, res) => {
  try {
    const { orderedIds } = req.body; // 예: [3,1,2]
    for (let i = 0; i < orderedIds.length; i++) {
      await db.query("UPDATE footer_nav SET order_index=? WHERE id=?", [i, orderedIds[i]]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Footer 순서 변경 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

exports.deleteFooterNav = async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM footer_nav WHERE id=?", [id]);
  res.json({ success: true });
};

exports.toggleFooterHidden = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden } = req.body; // 0 또는 1
    await db.query("UPDATE footer_nav SET hidden=? WHERE id=?", [hidden, id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Footer 숨기기 토글 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
};

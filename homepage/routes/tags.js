const router = require('express').Router();
const db = require('../db');


// 전체 태그(간단 오토컴플리트용)
router.get('/', async (req, res) => {
const [rows] = await db.query('SELECT id, name FROM tags ORDER BY name');
res.json(rows);
});


module.exports = router;
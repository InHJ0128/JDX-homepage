const db = require('../db');

const path = require('path');
const fs = require('fs');

const { extractActivityImageUrls, removeByUrl } = require('../services/uploadService');


//const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
//fs.mkdirSync(UPLOAD_DIR, { recursive: true });



// 활동 목록 조회 (언어별)
exports.listWork = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        title,
        title_ja,
        content,
        content_ja,
        emphasized,
        hidden,
        image_url,
        thumbnail_url,
        created_at
      FROM works
      ORDER BY emphasized DESC, created_at DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error('활동 목록 조회 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

//활동 단건 조회
exports.getWork = async (req, res) => {
  const id = req.params.id;
  try {
    const [[row]] = await db.query(
      `SELECT id, title, title_ja, content, content_ja,
              emphasized, hidden, image_url, thumbnail_url, created_at
       FROM works WHERE id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch (e) {
    console.error('활동 단건 조회 오류:', e);
    res.status(500).json({ message: '서버 오류' });
  }
};


// 활동 생성
exports.createWork = async (req, res) => {
  const {
    title       = '',
    title_ja    = '',
    content     = '',
    content_ja  = '',
    emphasized = 0,
    hidden = 0
  } = req.body;

  const toBit = (v) =>
    v === true || v === 'true' || v === '1' || v === 1 || v === 'on' ? 1 : 0;

  try {
    const { imageUrl, thumbnailUrl } = extractActivityImageUrls(req.files);
    const [result] = await db.query(
      `INSERT INTO works
         (title, title_ja, content, content_ja, emphasized, hidden, image_url, thumbnail_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, title_ja, content, content_ja, emphasized ? 1 : 0, hidden ? 1 : 0, imageUrl, thumbnailUrl]
    );
    res.status(201).json({ id: result.insertId, imageUrl, thumbnailUrl });
  } catch (err) {
    console.error('활동 생성 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 활동 수정
exports.updateWork = async (req, res) => {
  const id = req.params.id;

  // 넘어오지 않은 필드는 undefined 그대로 두는 게 포인트!
  const { title, title_ja, content, content_ja, emphasized, hidden } = req.body;

  // undefined → null 로 바꿔서 COALESCE가 기존 값을 유지하게 함
  const toNull = (v) => (typeof v === 'undefined' ? null : v);
  const toNullBool = (v) => {
    if (typeof v === 'undefined') return null;
    return v === true || v === 'true' || v === '1' || v === 1 ? 1 : 0;
  };
  try {
    const { imageUrl, thumbnailUrl } = extractActivityImageUrls(req.files);

    let sql = `
      UPDATE works SET
        title       = COALESCE(?, title),
        title_ja    = COALESCE(?, title_ja),
        content     = COALESCE(?, content),
        content_ja  = COALESCE(?, content_ja),
        emphasized  = COALESCE(?, emphasized),
        hidden      = COALESCE(?, hidden)
    `;
    const params = [
      toNull(title),
      toNull(title_ja),
      toNull(content),
      toNull(content_ja),
      toNullBool(emphasized),
      toNullBool(hidden),
    ];

    if (imageUrl) {
      sql += ', image_url = ?';
      params.push(imageUrl);
    }
    if (thumbnailUrl) {
      sql += ', thumbnail_url = ?';
      params.push(thumbnailUrl);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await db.query(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('활동 수정 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 삭제
exports.deleteWork = async (req, res) => {
  const id = req.params.id;

  try {
    // (선택) 파일도 함께 지우고 싶다면 현재 경로 조회
    const [[row]] = await db.query(
      'SELECT image_url, thumbnail_url FROM works WHERE id = ?',
      [id]
    );

    await db.query('DELETE FROM works WHERE id = ?', [id]);

    // (선택) 디스크 파일 삭제
    const uploadDir = path.join(__dirname, '../public/uploads');
    const safeUnlink = (url) => {
      if (!url) return;
      // url은 '/uploads/파일명' 형태라고 가정
      const filename = url.replace(/^\/uploads\//, '');
      const abs = path.join(uploadDir, filename);
      // uploads 폴더 밖 접근 방지
      if (abs.startsWith(uploadDir)) {
        fs.unlink(abs, () => {});
      }
    };
    safeUnlink(row?.image_url);
    safeUnlink(row?.thumbnail_url);

    res.json({ success: true });
  } catch (err) {
    console.error('활동 삭제 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

exports.hideWork = async (req, res) => {
  const id = req.params.id;
  const { hidden } = req.body;
  const toBit = (v) =>
    v === true || v === 'true' || v === '1' || v === 1 ? 1 : 0;
  try {
    const value = toBit(hidden);
    await db.query('UPDATE works SET hidden = ? WHERE id = ?', [value, id]);
    res.json({ success: true, hidden: !!value });
  } catch (err) {
    console.error('활동 숨기기 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 대표 이미지/썸네일 삭제
exports.deleteWorkFile = async (req, res) => {
  const id = req.params.id;
  const target = (req.query.target || '').toString(); // 'image' | 'thumbnail'
  if (!['image', 'thumbnail'].includes(target)) {
    return res.status(400).json({ message: "target must be 'image' or 'thumbnail'" });
  }
  const col = target === 'image' ? 'image_url' : 'thumbnail_url';

  try {
    // 현재 URL 조회
    const [[row]] = await db.query(`SELECT ${col} AS url FROM works WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const url = row.url;

    // 같은 파일을 다른 글이 쓰는지 확인(공유 중이면 파일은 지우지 않음)
    let removed = false;
    if (url) {
      const [[cntRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM works WHERE ${col} = ?`,
        [url]
      );
      if ((cntRow?.cnt || 0) <= 1) {
        removed = removeByUrl(url); // 디스크에서 삭제
      }
    }

    // DB 컬럼 NULL로
    await db.query(`UPDATE works SET ${col} = NULL WHERE id = ?`, [id]);
    res.json({ success: true, removed, target });
  } catch (err) {
    console.error('활동 이미지 삭제 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};
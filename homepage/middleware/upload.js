// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safe) || '.bin';
    const base = path.basename(safe, ext);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,  // 20MB per file
    fieldSize: 10 * 1024 * 1024, // 10MB per text field
    files: 10,
    fields: 100,
  },
  fileFilter: (req, file, cb) => {
    if ((file.fieldname === 'image' || file.fieldname === 'thumbnail') && !file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
    }
    cb(null, true);
  },
});



module.exports = upload;

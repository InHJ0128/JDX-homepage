// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// sharp 패키지 추가
const sharp = require('sharp'); 

const uploadDir = path.join(__dirname, '../public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// 🚨 diskStorage 대신 memoryStorage 사용 (메모리에서 먼저 받아서 압축하기 위함)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,  // 원본은 20MB까지 허용 (유저 배려)
  },
  fileFilter: (req, file, cb) => {
    if ((file.fieldname === 'image' || file.fieldname === 'thumbnail') && !file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
    }
    cb(null, true);
  },
});

// ✅ 압축을 수행하는 미들웨어 추가
const optimizeImage = async (req, res, next) => {
  // 파일이 아예 없으면 그냥 통과
  if (!req.files && !req.file) return next();

  try {
    // req.file(단일 파일)과 req.files(다중 파일)을 모두 하나의 배열로 모읍니다.
    let filesToProcess = [];
    if (req.file) filesToProcess.push(req.file);
    if (req.files) {
      for (const field in req.files) {
        filesToProcess.push(...req.files[field]);
      }
    }

    // 모아둔 파일들을 하나씩 꺼내서 압축하고 디스크에 저장합니다.
    for (const file of filesToProcess) {
      const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = path.extname(safe) || '.jpg';
      const base = path.basename(safe, ext);
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}.webp`;
      const filepath = path.join(uploadDir, filename);

      await sharp(file.buffer)
        .resize({ width: 1000, withoutEnlargement: true }) // 에디터용이므로 1000px
        .webp({ quality: 80 })
        .toFile(filepath);

      // 컨트롤러에서 쓸 수 있게 파일 정보 업데이트
      file.filename = filename;
      file.path = filepath;
    }
    next();
  } catch (err) {
    console.error("이미지 압축 중 에러:", err);
    next(err);
  }
};

// 라우터에서 쓸 수 있게 upload 객체와 미들웨어를 같이 내보냄
module.exports = { upload, optimizeImage };
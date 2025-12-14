// services/uploadService.js
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
/**
 * 업로드된 multer 파일 객체를 /uploads/파일명 형태의 URL로 변환
 * - server.js 에서 app.use('/uploads', express.static('public/uploads')) 가 설정되어 있어야 합니다.
 */
function fileToUrl(file) {
  if (!file) return null;
  return `/uploads/${file.filename}`;
}

function removeByUrl(url) {
  if (!url) return false;
  const filename = path.basename(url);                 // /uploads/AAAA.webp → AAAA.webp
  const abs = path.join(UPLOAD_DIR, filename);
  if (!abs.startsWith(UPLOAD_DIR)) return false;       // 안전장치
  if (fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); return true; } catch { /* ignore */ }
  }
  return false;
}

/**
 * multer.fields([{ name: 'image' }, { name: 'thumbnail' }]) 로 들어온
 * req.files 에서 DB 저장용 URL을 뽑아 반환
 */
function extractActivityImageUrls(files) {
  const imageFile = files?.image?.[0];
  const thumbFile = files?.thumbnail?.[0];
  return {
    imageUrl: fileToUrl(imageFile),
    thumbnailUrl: fileToUrl(thumbFile),
  };
}

module.exports = { fileToUrl, extractActivityImageUrls, removeByUrl };

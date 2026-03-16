const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // npm install sharp 필수

// 실제 uploads 폴더 경로에 맞게 확인해주세요
const uploadDir = path.join(__dirname, 'public/uploads');

async function optimizeExistingImages() {
  console.log("🚀 뚱뚱한 과거 사진들 다이어트 수사를 시작합니다...");
  const files = fs.readdirSync(uploadDir);

  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);

    // 1. 200KB 이하는 이미 날씬하므로 패스 (스크린샷의 30KB webp들 보호)
    if (stats.size < 200 * 1024) {
      // console.log(`⏩ 패스 (이미 가벼움): ${file}`);
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    
    // 2. 이미지 파일만 타겟으로 지정
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const tempPath = filePath + '.tmp';

      try {
        // 가로 사이즈 최대 1000px로 제한 (모바일에 충분한 사이즈)
        let pipeline = sharp(filePath).resize({ width: 1000, withoutEnlargement: true });

        // 3. 확장자별 맞춤 다이어트 처방
        if (ext === '.png') {
          // PNG는 palette 옵션을 켜야 용량이 마법처럼 줄어듭니다!
          pipeline = pipeline.png({ quality: 80, palette: true });
        } else if (ext === '.jpg' || ext === '.jpeg') {
          pipeline = pipeline.jpeg({ quality: 80 });
        } else if (ext === '.webp') {
          pipeline = pipeline.webp({ quality: 80 });
        }

        // 임시 파일로 저장 후 원본 덮어쓰기
        await pipeline.toFile(tempPath);
        fs.renameSync(tempPath, filePath);
        
        const newStats = fs.statSync(filePath);
        console.log(`✅ 다이어트 성공: ${file} (${Math.round(stats.size/1024)}KB ➡️  ${Math.round(newStats.size/1024)}KB)`);
      } catch (err) {
        console.error(`❌ 에러 발생 (${file}):`, err.message);
      }
    }
  }
  console.log("🎉 모든 기존 사진의 최적화가 끝났습니다! 라이트하우스 점수를 확인해 보세요.");
}

optimizeExistingImages();
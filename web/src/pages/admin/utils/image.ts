interface ConvertOptions {
  maxWidth?: number;     // 최대 가로 크기
  quality?: number;      // 압축 품질
  prefer?: string;       // 기본 MIME 타입 (예: "image/webp", "image/jpeg")
}

export async function convertToWebP(file: File, options: ConvertOptions = {}): Promise<File> {
  const { maxWidth = 0, quality = 0.8, prefer = "image/webp" } = options;

  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");

  // 🔧 maxWidth 옵션 적용
  if (maxWidth > 0 && bitmap.width > maxWidth) {
    const ratio = maxWidth / bitmap.width;
    canvas.width = maxWidth;
    canvas.height = bitmap.height * ratio;
  } else {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context를 가져올 수 없습니다.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  // toBlob (nullable 처리)
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), prefer, quality)
  );

  if (!blob) throw new Error("이미지 변환 실패 (blob is null)");

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${file.name}.${ext}`, { type: blob.type });
}

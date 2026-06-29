/** 在瀏覽器壓縮圖片，降低上傳與儲存成本 */
export async function compressImageFile(
  file: File,
  maxEdge = 1600,
  quality = 0.82
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return { blob: file, fileName: file.name, mimeType: file.type };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { blob: file, fileName: file.name, mimeType: file.type };
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("壓縮失敗"))),
      mimeType,
      quality
    );
  });

  const ext = mimeType === "image/png" ? ".png" : ".jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return { blob, fileName: `${baseName}${ext}`, mimeType };
}

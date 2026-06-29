const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/** 單檔 base64 約 1.5MB */
export const MAX_ATTACHMENT_BYTES = 1_500_000;

export function isAllowedAttachmentMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export function attachmentSizeError(byteLength: number): string | null {
  if (byteLength > MAX_ATTACHMENT_BYTES) {
    return `檔案過大（上限 ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB）`;
  }
  return null;
}

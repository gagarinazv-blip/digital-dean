export function formatFileSize(sizeBytes: number): string {
  return sizeBytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(sizeBytes / 1024))} КБ`
    : `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

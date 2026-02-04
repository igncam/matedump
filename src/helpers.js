export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(ms) {
  if (!Number.isFinite(ms)) return "";
  const date = new Date(ms);
  return date.toLocaleString();
}

export function downloadTextFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function toCsvRows(metadata) {
  const lines = ["key,value"];
  Object.entries(metadata).forEach(([key, value]) => {
    const safeValue = String(value).replace(/"/g, '""');
    lines.push(`"${key}","${safeValue}"`);
  });
  return lines.join("\n");
}

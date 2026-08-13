export interface HubFileVisual {
  icon: string;
  label: string;
  colorClass: string;
  bgClass: string;
}

const EXT_MIME_HINTS: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
};

/**
 * Detect UTF-8 text misread as Latin-1 (typical multipart filename corruption).
 */
export function looksLikeMojibake(name: string): boolean {
  return (
    /[\uFFFD]/.test(name) ||
    /â€[\u009C\u009D\u0094\u0093]/.test(name) ||
    /[\u00E0-\u00EF][\u0080-\u00BF]{2}/.test(name) ||
    /[\u00C2-\u00DF][\u0080-\u00BF]/.test(name)
  );
}

/**
 * Re-decode Latin-1 misread UTF-8 bytes (e.g. em dash showing as â€").
 */
export function fixUtf8Mojibake(name: string): string {
  if (!name || !looksLikeMojibake(name)) return name;

  try {
    const bytes = Uint8Array.from(name, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (decoded && !decoded.includes('\uFFFD') && decoded.length > 0) {
      return decoded;
    }
  } catch {
    // fall through
  }

  return name;
}

/**
 * Prefer the browser filename when the server name looks corrupted.
 */
export function pickBestFileName(clientName: string, serverName?: string): string {
  if (!serverName?.trim()) return normalizeDisplayFileName(clientName);
  if (looksLikeMojibake(serverName) && !looksLikeMojibake(clientName)) {
    return normalizeDisplayFileName(clientName);
  }
  return normalizeDisplayFileName(serverName);
}

/**
 * Normalize filenames for display (fix mojibake, preserve original punctuation).
 */
export function normalizeDisplayFileName(name: string): string {
  if (!name) return name;

  let result = fixUtf8Mojibake(name).normalize('NFKC');

  if (looksLikeMojibake(result)) {
    result = result
      .replace(/â€"/g, '—')
      .replace(/â€"/g, '–')
      .replace(/â¦+/g, '…')
      .replace(/\uFFFD/g, '-');
  }

  return result
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split a filename into base name and extension for clearer truncation.
 */
export function splitDisplayFileName(name: string): { base: string; ext: string; full: string } {
  const full = normalizeDisplayFileName(name);
  const lastDot = full.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === full.length - 1) {
    return { base: full, ext: '', full };
  }
  return {
    base: full.slice(0, lastDot),
    ext: full.slice(lastDot),
    full,
  };
}

/** Hub-stored names use "REF — originalFileName"; show the readable original part. */
export function getAttachmentDisplayName(fileName?: string): string {
  if (!fileName?.trim()) return 'Attachment';
  const normalized = normalizeDisplayFileName(fileName.trim());
  const hubPrefix = normalized.match(/^(?:HS-\d{4}-\d{6}|HT-\d{4}-\d{5})\s*[—–-]\s*(.+)$/);
  if (hubPrefix?.[1]) {
    return normalizeDisplayFileName(hubPrefix[1]);
  }
  return normalized;
}

export function inferMimeFromFileName(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? EXT_MIME_HINTS[ext] : undefined;
}

/**
 * Resolve icon, label, and colors from MIME type and/or file extension.
 */
export function resolveHubFileVisual(fileName?: string, mimeType?: string): HubFileVisual {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  const mime = (mimeType || EXT_MIME_HINTS[ext] || '').toLowerCase();

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return { icon: 'ri-image-2-line', label: 'Image', colorClass: 'text-pink-600', bgClass: 'bg-pink-50 ring-pink-100' };
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
    return { icon: 'ri-video-line', label: 'Video', colorClass: 'text-violet-600', bgClass: 'bg-violet-50 ring-violet-100' };
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return { icon: 'ri-music-2-line', label: 'Audio', colorClass: 'text-fuchsia-600', bgClass: 'bg-fuchsia-50 ring-fuchsia-100' };
  }
  if (mime.includes('pdf') || ext === 'pdf') {
    return { icon: 'ri-file-pdf-2-line', label: 'PDF', colorClass: 'text-red-600', bgClass: 'bg-red-50 ring-red-100' };
  }
  if (
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('msword') ||
    ['doc', 'docx'].includes(ext)
  ) {
    return { icon: 'ri-file-word-2-line', label: 'Word', colorClass: 'text-blue-600', bgClass: 'bg-blue-50 ring-blue-100' };
  }
  if (
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime.includes('sheet') ||
    mime.includes('csv') ||
    ['xls', 'xlsx', 'csv'].includes(ext)
  ) {
    return {
      icon: 'ri-file-excel-2-line',
      label: ext === 'csv' ? 'CSV' : 'Excel',
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50 ring-emerald-100',
    };
  }
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    ['ppt', 'pptx'].includes(ext)
  ) {
    return { icon: 'ri-file-ppt-2-line', label: 'PowerPoint', colorClass: 'text-orange-600', bgClass: 'bg-orange-50 ring-orange-100' };
  }
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: 'ri-folder-zip-line', label: 'Archive', colorClass: 'text-amber-700', bgClass: 'bg-amber-50 ring-amber-100' };
  }
  if (mime.startsWith('text/') || ['txt', 'md', 'json', 'xml'].includes(ext)) {
    return { icon: 'ri-file-text-line', label: ext.toUpperCase() || 'Text', colorClass: 'text-slate-600', bgClass: 'bg-slate-50 ring-slate-100' };
  }

  return {
    icon: 'ri-file-3-line',
    label: ext ? ext.toUpperCase() : 'File',
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 ring-indigo-100',
  };
}

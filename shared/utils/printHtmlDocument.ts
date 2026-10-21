/**
 * Escapes text before it is dropped into a printable HTML document.
 */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Opens a print dialog for a small HTML document.
 */
export function printHtmlDocument(title: string, body: string): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) throw new Error('Allow popups to print');
  popup.document.write(documentHtml(title, body));
  popup.document.close();
}

/**
 * Downloads the same HTML so it can be opened and saved as PDF.
 */
export function downloadHtmlDocument(filename: string, title: string, body: string): void {
  const blob = new Blob([documentHtml(title, body)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Shared printable shell.
 */
function documentHtml(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:18px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ccc;padding:6px;text-align:left}p{font-size:12px}</style>
</head><body>${body}<script>window.print()</script></body></html>`;
}

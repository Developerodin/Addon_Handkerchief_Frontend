/**
 * Opens a plain printable note. No barcode library: the code is large text a scanner can read.
 * @param title Heading on the page
 * @param lines One fact per line
 */
export function printStoreNote(title: string, lines: string[]): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) {
    throw new Error('Allow popups to print');
  }
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = lines.map((line) => `<p>${escape(line)}</p>`).join('');
  popup.document.write(
    `<!doctype html><html><head><title>${escape(title)}</title></head><body style="font-family:sans-serif"><h1>${escape(title)}</h1>${body}<script>window.print()</script></body></html>`
  );
  popup.document.close();
}

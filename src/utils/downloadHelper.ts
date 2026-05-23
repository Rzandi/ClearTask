/* ═══════════════════════════════════════════════════════════
   downloadHelper.js — ClearTask
   Native browser file download utility.
   Replaces file-saver dependency (deps-report.md W4-2).
   Separated into its own module so tests can mock it cleanly.
   ═══════════════════════════════════════════════════════════ */

/**
 * Trigger a file download using the native browser File API.
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  if (a.parentNode) {
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

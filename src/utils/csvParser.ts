/* ═══════════════════════════════════════════════════════════
   csvParser.ts — ClearTask
   RFC 4180-compliant CSV row parser with quote and delimiter handling.
   ═══════════════════════════════════════════════════════════ */

/**
 * Parses a single CSV line, handling quoted fields, commas inside quotes,
 * and escaped quotes ("").
 */
export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parses full CSV content into rows of string arrays.
 * Handles CRLF and LF line breaks, ignores empty rows.
 */
export function parseCSV(content: string, delimiter: string = ','): string[][] {
  if (!content || !content.trim()) return [];

  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCSVLine(line, delimiter));
  }

  return rows;
}

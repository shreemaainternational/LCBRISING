/**
 * Minimal RFC 4180-compliant CSV parser. Streams row-by-row out of a
 * single string so we don't pull in a CSV dependency.
 *
 * - Handles quoted fields with embedded commas, quotes, and newlines.
 * - Treats `\r\n`, `\n`, and `\r` as record separators.
 * - Skips trailing empty lines.
 */

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      pushField();
      i++;
      continue;
    }
    if (ch === '\r') {
      pushField();
      pushRow();
      if (input[i + 1] === '\n') i += 2;
      else i++;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export type CsvTable<T extends string = string> = {
  headers: T[];
  rows: Record<T, string>[];
};

export function csvToTable<T extends string = string>(input: string): CsvTable<T> {
  const matrix = parseCsv(input);
  if (matrix.length === 0) return { headers: [], rows: [] };
  const [headerRow, ...dataRows] = matrix;
  const headers = headerRow.map((h) => h.trim()) as T[];
  const rows = dataRows.map((cols) => {
    const obj = {} as Record<T, string>;
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (cols[i] ?? '').trim();
    }
    return obj;
  });
  return { headers, rows };
}

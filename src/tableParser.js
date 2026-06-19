function cleanCell(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

function normalizeRows(rows) {
  const cleaned = rows
    .map(row => row.map(cleanCell))
    .filter(row => row.some(Boolean));
  if (cleaned.length < 2) return null;

  const maxCols = Math.max(...cleaned.map(row => row.length));
  if (maxCols < 2) return null;

  const normalized = cleaned.map(row => [
    ...row,
    ...Array(Math.max(0, maxCols - row.length)).fill('')
  ]);
  return normalized;
}

function isMarkdownSeparator(row) {
  return row.every(cell => /^:?-{3,}:?$/.test(cleanCell(cell)));
}

function parseMarkdownTable(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  let best = [];
  let current = [];
  for (const line of lines) {
    if (line.includes('|') && /^\|?(.+\|)+.+\|?$/.test(line)) {
      current.push(line);
    } else {
      if (current.length > best.length) best = current;
      current = [];
    }
  }
  if (current.length > best.length) best = current;
  if (best.length < 2) return null;

  const rows = best.map(line => {
    let value = line.trim();
    if (value.startsWith('|')) value = value.slice(1);
    if (value.endsWith('|')) value = value.slice(0, -1);
    return value.split('|').map(cleanCell);
  });

  const withoutSeparators = rows.filter(row => !isMarkdownSeparator(row));
  return normalizeRows(withoutSeparators);
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map(cleanCell);
}

function parseDelimitedTable(text, delimiter) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const candidateLines = lines.filter(line => line.includes(delimiter));
  if (candidateLines.length < 2) return null;

  const rows = candidateLines.map(line => splitDelimitedLine(line, delimiter));
  const normalized = normalizeRows(rows);
  if (!normalized) return null;

  const multiColumnRows = normalized.filter(row => row.filter(Boolean).length >= 2).length;
  return multiColumnRows >= 2 ? normalized : null;
}

function parseAlignedTextTable(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  let best = [];
  let current = [];
  for (const line of lines) {
    if (/\S\s{2,}\S/.test(line)) {
      current.push(line);
    } else {
      if (current.length > best.length) best = current;
      current = [];
    }
  }
  if (current.length > best.length) best = current;
  if (best.length < 2) return null;

  const rows = best.map(line => line.split(/\s{2,}/).map(cleanCell));
  return normalizeRows(rows);
}

function parseTable(text) {
  const value = String(text || '').trim();
  if (!value) return null;

  const parsers = [
    parseMarkdownTable,
    input => parseDelimitedTable(input, '\t'),
    input => parseDelimitedTable(input, ','),
    parseAlignedTextTable
  ];

  for (const parser of parsers) {
    const rows = parser(value);
    if (rows) {
      return {
        rows,
        rowCount: rows.length,
        columnCount: Math.max(...rows.map(row => row.length))
      };
    }
  }
  return null;
}

function tableToTsv(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => row.map(cleanCell).join('\t'))
    .join('\n');
}

module.exports = {
  parseTable,
  tableToTsv
};

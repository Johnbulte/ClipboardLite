function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function transformText(value, action) {
  const text = normalizeText(value);
  if (action === 'single-line') {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join(' ');
  }
  if (action === 'clean-spaces') {
    return text
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .join('\n')
      .trim();
  }
  if (action === 'dedupe-lines') {
    const seen = new Set();
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (!line || seen.has(line)) return false;
        seen.add(line);
        return true;
      })
      .join('\n');
  }
  if (action === 'sort-lines') {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .join('\n');
  }
  return text;
}

module.exports = {
  transformText
};

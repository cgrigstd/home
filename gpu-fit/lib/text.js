const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '\u00b7',
  ndash: '\u2013',
  mdash: '\u2014',
};

export function decodeEntities(value) {
  if (!value) return '';
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (full, name) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED, key) ? NAMED[key] : full;
    });
}

export function stripTags(value) {
  return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function firstMatch(value, regex) {
  const match = regex.exec(value);
  return match ? match[1] : '';
}

export function occurrences(value, needle) {
  let count = 0;
  let index = 0;
  while ((index = value.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

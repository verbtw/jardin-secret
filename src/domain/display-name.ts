export function formatDisplayName(value: string) {
  return value.trim().split(/\s+/).map((word) => {
    if (/^[IVXLCDM]+$/.test(word)) return word;
    const lower = word.toLocaleLowerCase('ru-RU');
    return lower.replace(/(^|[-–—'’])\p{L}/gu, (letter) => letter.toLocaleUpperCase('ru-RU'));
  }).join(' ');
}

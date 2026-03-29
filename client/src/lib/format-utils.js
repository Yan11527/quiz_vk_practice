export function formatDate(dateValue, locale = 'ru-RU') {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleString(locale);
}

export function getScoreWord(value) {
  const abs = Math.abs(Number(value));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return 'баллов';
  if (mod10 === 1) return 'балл';
  if (mod10 >= 2 && mod10 <= 4) return 'балла';
  return 'баллов';
}

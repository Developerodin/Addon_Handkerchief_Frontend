/** Allow letters, spaces, and common name punctuation only. */
export const filterTextOnly = (value: string): string =>
  value.replace(/[^a-zA-Z\s\-'.&]/g, '');

/** Allow whole numbers only. */
export const filterDigitsOnly = (value: string): string =>
  value.replace(/\D/g, '');

/** Allow digits with at most one decimal point. */
export const filterDecimalInput = (value: string): string => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) return cleaned;
  const beforeDot = cleaned.slice(0, dotIndex);
  const afterDot = cleaned.slice(dotIndex + 1).replace(/\./g, '');
  return `${beforeDot}.${afterDot}`;
};

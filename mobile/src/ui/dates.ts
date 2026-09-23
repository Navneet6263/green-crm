const IST_OFFSET = 330 * 60000;
export function istParts(value = new Date().toISOString()) {
  const date = new Date(new Date(value).getTime() + IST_OFFSET);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() };
}
export function fromIst(year: number, month: number, day: number, hour: number, minute: number) {
  if (![year, month, day, hour, minute].every(Number.isInteger) || hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('Use a time between 00:00 and 23:59.');
  const date = new Date(Date.UTC(year, month, day, hour, minute));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) throw new Error('Choose a valid date.');
  return new Date(date.getTime() - IST_OFFSET).toISOString();
}

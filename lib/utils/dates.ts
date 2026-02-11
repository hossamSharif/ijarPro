import dayjs from 'dayjs';

const SAUDI_TIMEZONE_OFFSET = 3; // UTC+3

export function toSaudiDate(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + SAUDI_TIMEZONE_OFFSET * 3600000);
}

export function formatGregorian(date: Date, locale: string = 'ar'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatHijri(date: Date): string {
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDualDate(date: Date, locale: string = 'ar'): string {
  const hijri = formatHijri(date);
  const gregorian = formatGregorian(date, locale);
  return `${hijri} — ${gregorian}`;
}

export function formatISO8601WithTimezone(date: Date): string {
  const saudi = toSaudiDate(date);
  return dayjs(saudi).format('YYYY-MM-DDTHH:mm:ss') + '+03:00';
}

export function formatShortDate(date: Date, locale: string = 'ar'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatNumber(value: number, locale: string = 'ar'): string {
  const numberingSystem = locale === 'ar' ? 'arab' : 'latn';
  return new Intl.NumberFormat(`${locale}-u-nu-${numberingSystem}`).format(value);
}

export function formatDecimal(value: number, locale: string = 'ar', decimals: number = 2): string {
  const numberingSystem = locale === 'ar' ? 'arab' : 'latn';
  return new Intl.NumberFormat(`${locale}-u-nu-${numberingSystem}`, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercentage(value: number, locale: string = 'ar'): string {
  const numberingSystem = locale === 'ar' ? 'arab' : 'latn';
  return new Intl.NumberFormat(`${locale}-u-nu-${numberingSystem}`, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function toWesternDigits(value: string): string {
  return value.replace(/[\u0660-\u0669]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48)
  );
}

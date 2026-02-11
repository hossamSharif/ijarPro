export function formatCurrency(amount: number, locale: string = 'ar'): string {
  const numberingSystem = locale === 'ar' ? 'arab' : 'latn';
  const formatted = new Intl.NumberFormat(`${locale}-SA-u-nu-${numberingSystem}`, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const symbol = locale === 'ar' ? 'ر.س' : 'SAR';
  return `${formatted} ${symbol}`;
}

export function formatCurrencyCompact(amount: number, locale: string = 'ar'): string {
  const numberingSystem = locale === 'ar' ? 'arab' : 'latn';
  const formatted = new Intl.NumberFormat(`${locale}-SA-u-nu-${numberingSystem}`, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: 'compact',
  }).format(amount);

  const symbol = locale === 'ar' ? 'ر.س' : 'SAR';
  return `${formatted} ${symbol}`;
}

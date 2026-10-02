export function formatCurrency(amount: number | string | null | undefined, currencyCode?: string, currencySymbolOverride?: string) {
  const value = Number(amount ?? 0);
  const code = 'NGN';
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value);
  } catch (err) {
    const symbol = currencySymbolOverride ?? '₦';
    return `${symbol}${value.toFixed(2)}`;
  }
}

export function currencySymbolFromCode(code?: string) {
  return '₦';
}

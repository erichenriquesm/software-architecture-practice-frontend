const formatters = new Map<number, Intl.NumberFormat>();

const formatterFor = (decimals: number): Intl.NumberFormat => {
  const cached = formatters.get(decimals);
  if (cached) return cached;
  const created = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  formatters.set(decimals, created);
  return created;
};

/** Formats a decimal string as the API sends it ("83000.00000000"), never through a JS number. */
export const formatDecimal = (value: string, decimals: number): string =>
  formatterFor(decimals).format(value as Intl.StringNumericLiteral);

export const decimalsOfAsset = (assetId: string): number => (assetId === 'BTC' ? 8 : 2);

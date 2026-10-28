/** How each asset is drawn and named in the wallet. */
export const assetNames: Readonly<Record<string, string>> = { USD: 'Dólar americano', BTC: 'Bitcoin' };

export const assetNameOf = (assetId: string): string => assetNames[assetId] ?? assetId;

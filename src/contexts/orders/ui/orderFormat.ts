import { marketOf } from '@/entities/market';
import { decimalsOfAsset, formatDecimal } from '@/lastro';

const shortTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fullTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const formatShortTime = (iso: string): string => shortTime.format(new Date(iso)).replace(',', '');

export const formatFullTime = (iso: string): string => fullTime.format(new Date(iso)).replace(',', '');

export const assetsOf = (marketId: string): { readonly base: string; readonly quote: string } => {
  const market = marketOf(marketId);
  if (market) return market;
  const [base = marketId, quote = ''] = marketId.split('-');
  return { base, quote };
};

export const formatAmount = (value: string, assetId: string): string => formatDecimal(value, decimalsOfAsset(assetId));

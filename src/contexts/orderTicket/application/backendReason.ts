import { formatDecimal } from '@/shared/format/decimal';

/** The order service answers 422 with "<field>: <reason>" in English; the ticket shows it in plain Portuguese. */
const rules: ReadonlyArray<{ readonly pattern: RegExp; readonly text: (match: RegExpMatchArray) => string }> = [
  { pattern: /^price: must be a multiple of the tick ([\d.]+)/, text: ([, tick]) => `O preço precisa ser múltiplo de ${formatDecimal(String(tick), 2)} (no máximo 2 casas decimais).` },
  { pattern: /^price: quantity × price must be at least ([\d.]+)/, text: ([, min]) => `O total da ordem (quantidade × preço) precisa ser de pelo menos ${formatDecimal(String(min), 2)} USD.` },
  { pattern: /^price: cannot exceed ([\d.]+)/, text: ([, max]) => `O preço máximo aceito é ${formatDecimal(String(max), 2)} USD.` },
  { pattern: /^price: /, text: () => 'Informe um preço maior que zero, com no máximo 2 casas decimais.' },
  { pattern: /^quantity: must be a multiple of the step ([\d.]+)/, text: ([, step]) => `A quantidade precisa ser múltipla de ${String(step).replace('.', ',')} BTC (no máximo 5 casas decimais).` },
  { pattern: /^quantity: must be at least ([\d.]+)/, text: ([, min]) => `A quantidade mínima é ${String(min).replace('.', ',')} BTC.` },
  { pattern: /^quantity: cannot exceed ([\d.]+)/, text: ([, max]) => `A quantidade máxima por ordem é ${formatDecimal(String(max), 0)} BTC.` },
  { pattern: /^quantity: has more than (\d+) decimal places/, text: ([, places]) => `Use no máximo ${places} casas decimais na quantidade.` },
  { pattern: /^quantity: /, text: () => 'Informe uma quantidade maior que zero.' },
  { pattern: /^marketId: .* not an active market/, text: () => 'Este mercado não está aberto para ordens agora.' },
];

export const backendReasonText = (backendMessage: string): string | undefined => {
  for (const rule of rules) {
    const match = backendMessage.match(rule.pattern);
    if (match) return rule.text(match);
  }
  return undefined;
};

import { Decimal } from 'decimal.js';

export interface SparkFrame {
  readonly width: number;
  readonly height: number;
  /** Room above and below the line so the stroke and the end dot are not clipped. */
  readonly inset: number;
}

export type Trend = 'up' | 'down' | 'flat';

export interface Sparkline {
  /** SVG path data; empty with fewer than two prices. */
  readonly line: string;
  /** The line closed down to the bottom edge, for the gradient fill. */
  readonly area: string;
  readonly end?: { readonly x: string; readonly y: string } | undefined;
  readonly trend: Trend;
  readonly first?: string | undefined;
  readonly last?: string | undefined;
  /** last − first, exact. */
  readonly change?: string | undefined;
  /** (last − first) / first × 100, two places. */
  readonly changePercent?: string | undefined;
}

const coordinate = (value: Decimal): string => value.toDecimalPlaces(1).toFixed();

const trendOf = (first: Decimal, last: Decimal): Trend => {
  if (last.greaterThan(first)) return 'up';
  if (last.lessThan(first)) return 'down';
  return 'flat';
};

/** Prices oldest first, spread evenly on x; a flat series sits in the middle instead of on an edge. */
export const sparklineOf = (pricesOldestFirst: readonly string[], frame: SparkFrame): Sparkline => {
  if (pricesOldestFirst.length < 2) return { line: '', area: '', trend: 'flat', first: pricesOldestFirst[0], last: pricesOldestFirst[0] };
  const prices = pricesOldestFirst.map((price) => new Decimal(price));
  const low = Decimal.min(...prices);
  const high = Decimal.max(...prices);
  const range = high.minus(low);
  const top = new Decimal(frame.inset);
  const bottom = new Decimal(frame.height).minus(frame.inset);
  const step = new Decimal(frame.width).div(prices.length - 1);
  const y = (price: Decimal): Decimal => (range.isZero() ? top.plus(bottom).div(2) : bottom.minus(bottom.minus(top).times(price.minus(low).div(range))));
  const points = prices.map((price, index) => ({ x: coordinate(step.times(index)), y: coordinate(y(price)) }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const first = prices[0] as Decimal;
  const last = prices.at(-1) as Decimal;
  return {
    line,
    area: `${line} L${frame.width},${frame.height} L0,${frame.height} Z`,
    end: points.at(-1),
    trend: trendOf(first, last),
    first: pricesOldestFirst[0],
    last: pricesOldestFirst.at(-1),
    change: last.minus(first).toFixed(),
    changePercent: first.isZero() ? undefined : last.minus(first).div(first).times(100).toFixed(2),
  };
};

/** Where the last price sits between the 24 h low and high, 0 to 100; undefined when the range is unknown. */
export const rangePosition = (low: string | undefined, high: string | undefined, price: string | undefined): string | undefined => {
  if (low === undefined || high === undefined || price === undefined) return undefined;
  const range = new Decimal(high).minus(low);
  if (range.lessThanOrEqualTo(0)) return '50';
  const position = new Decimal(price).minus(low).div(range).times(100);
  return Decimal.min(100, Decimal.max(0, position)).toDecimalPlaces(1).toFixed();
};

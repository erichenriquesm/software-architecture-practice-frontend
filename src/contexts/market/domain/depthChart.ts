import { Decimal } from 'decimal.js';
import { cumulativeLevels, sortAsks, sortBids } from './depth';
import type { CumulativeLevel } from './depth';
import type { DepthLevel } from './marketData';

export interface ChartFrame {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  /** Empty space between the bid half and the ask half. */
  readonly gap: number;
}

export interface DepthChartGeometry {
  /** SVG polygon points; empty when the side has no levels. */
  readonly bidPoints: string;
  readonly askPoints: string;
  readonly maxCumulative: string;
  readonly halfCumulative: string;
  readonly bidTotal?: string | undefined;
  readonly askTotal?: string | undefined;
  readonly bestBid?: string | undefined;
  readonly bestAsk?: string | undefined;
  readonly lowestBid?: string | undefined;
  readonly highestAsk?: string | undefined;
}

const coordinate = (value: Decimal): string => value.toDecimalPlaces(1).toFixed();

const point = (x: Decimal, y: Decimal): string => `${coordinate(x)},${coordinate(y)}`;

/** Maps a price into [inner, outer]: the best price sits at the inner edge, the farthest at the outer edge. */
const xScale = (levels: readonly CumulativeLevel[], inner: Decimal, outer: Decimal) => {
  const best = new Decimal(levels[0]?.price ?? 0);
  const farthest = new Decimal(levels.at(-1)?.price ?? 0);
  const range = farthest.minus(best).abs();
  return (price: string): Decimal => {
    if (range.isZero()) return inner;
    return inner.plus(outer.minus(inner).times(new Decimal(price).minus(best).abs().div(range)));
  };
};

/** A step line: each level holds its running total until the next, farther price. */
const stepPolygon = (levels: readonly CumulativeLevel[], inner: Decimal, outer: Decimal, y: (cumulative: string) => Decimal, bottom: Decimal): string => {
  if (levels.length === 0) return '';
  const x = xScale(levels, inner, outer);
  const points = [point(inner, bottom)];
  levels.forEach((level, index) => {
    const previous = levels[index - 1];
    if (previous) points.push(point(x(level.price), y(previous.cumulative)));
    points.push(point(x(level.price), y(level.cumulative)));
  });
  points.push(point(outer, y(levels.at(-1)?.cumulative ?? '0')), point(outer, bottom));
  return points.join(' ');
};

/** Cumulative depth: bids on the left half, asks on the right, both sharing one quantity axis. */
export const depthChartGeometry = (bids: readonly DepthLevel[], asks: readonly DepthLevel[], frame: ChartFrame): DepthChartGeometry => {
  const bidSeries = cumulativeLevels(sortBids(bids));
  const askSeries = cumulativeLevels(sortAsks(asks));
  const bidTotal = bidSeries.at(-1)?.cumulative;
  const askTotal = askSeries.at(-1)?.cumulative;
  const maxCumulative = Decimal.max(bidTotal ?? 0, askTotal ?? 0);
  const top = new Decimal(frame.top);
  const bottom = new Decimal(frame.bottom);
  const y = (cumulative: string): Decimal => (maxCumulative.isZero() ? bottom : bottom.minus(bottom.minus(top).times(new Decimal(cumulative).div(maxCumulative))));
  const middle = new Decimal(frame.left).plus(frame.right).div(2);
  const halfGap = new Decimal(frame.gap).div(2);
  return {
    bidPoints: stepPolygon(bidSeries, middle.minus(halfGap), new Decimal(frame.left), y, bottom),
    askPoints: stepPolygon(askSeries, middle.plus(halfGap), new Decimal(frame.right), y, bottom),
    maxCumulative: maxCumulative.toFixed(),
    halfCumulative: maxCumulative.div(2).toFixed(),
    bidTotal,
    askTotal,
    bestBid: bidSeries[0]?.price,
    bestAsk: askSeries[0]?.price,
    lowestBid: bidSeries.at(-1)?.price,
    highestAsk: askSeries.at(-1)?.price,
  };
};

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

export type DepthSide = 'bid' | 'ask';

/** One flat stretch of the step line: a price level holding its running total until the next, farther price. */
export interface DepthStep {
  readonly side: DepthSide;
  readonly price: string;
  readonly cumulative: string;
  /** SVG coordinates of the stretch, inner edge first. */
  readonly from: number;
  readonly to: number;
  readonly y: number;
}

/** How one half maps prices to x, kept so a pointer x can be turned back into a price. */
export interface DepthScale {
  readonly inner: number;
  readonly outer: number;
  readonly best: string;
  readonly farthest: string;
}

export interface DepthChartGeometry {
  /** SVG polygon points; empty when the side has no levels. */
  readonly bidPoints: string;
  readonly askPoints: string;
  /** The same shapes as path data: the filled area and the step line on top of it. */
  readonly bidArea: string;
  readonly askArea: string;
  readonly bidLine: string;
  readonly askLine: string;
  readonly steps: readonly DepthStep[];
  readonly scales: Readonly<Partial<Record<DepthSide, DepthScale>>>;
  /** x of the boundary between the halves, where the mid price sits. */
  readonly middle: number;
  readonly midPrice?: string | undefined;
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

interface SideShape {
  readonly points: string[];
  readonly steps: DepthStep[];
}

/** A step line: each level holds its running total until the next, farther price. */
const stepShape = (side: DepthSide, levels: readonly CumulativeLevel[], inner: Decimal, outer: Decimal, y: (cumulative: string) => Decimal, bottom: Decimal): SideShape => {
  if (levels.length === 0) return { points: [], steps: [] };
  const x = xScale(levels, inner, outer);
  const points = [point(inner, bottom)];
  const steps: DepthStep[] = [];
  levels.forEach((level, index) => {
    const previous = levels[index - 1];
    if (previous) points.push(point(x(level.price), y(previous.cumulative)));
    points.push(point(x(level.price), y(level.cumulative)));
    const next = levels[index + 1];
    const from = index === 0 ? inner : x(level.price);
    steps.push({ side, price: level.price, cumulative: level.cumulative, from: Number(coordinate(from)), to: Number(coordinate(next ? x(next.price) : outer)), y: Number(coordinate(y(level.cumulative))) });
  });
  points.push(point(outer, y(levels.at(-1)?.cumulative ?? '0')), point(outer, bottom));
  return { points, steps };
};

const scaleOf = (levels: readonly CumulativeLevel[], inner: Decimal, outer: Decimal): DepthScale | undefined => {
  const best = levels[0]?.price;
  const farthest = levels.at(-1)?.price;
  if (best === undefined || farthest === undefined) return undefined;
  return { inner: Number(coordinate(inner)), outer: Number(coordinate(outer)), best, farthest };
};

const areaPath = (points: readonly string[]): string => (points.length === 0 ? '' : `M${points.join(' L')} Z`);

/** The top edge only: the area without the two points on the baseline. */
const linePath = (points: readonly string[]): string => (points.length < 3 ? '' : `M${points.slice(1, -1).join(' L')}`);

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
  const bidInner = middle.minus(halfGap);
  const askInner = middle.plus(halfGap);
  const bid = stepShape('bid', bidSeries, bidInner, new Decimal(frame.left), y, bottom);
  const ask = stepShape('ask', askSeries, askInner, new Decimal(frame.right), y, bottom);
  const bidScale = scaleOf(bidSeries, bidInner, new Decimal(frame.left));
  const askScale = scaleOf(askSeries, askInner, new Decimal(frame.right));
  const bestBid = bidSeries[0]?.price;
  const bestAsk = askSeries[0]?.price;
  return {
    bidPoints: bid.points.join(' '),
    askPoints: ask.points.join(' '),
    bidArea: areaPath(bid.points),
    askArea: areaPath(ask.points),
    bidLine: linePath(bid.points),
    askLine: linePath(ask.points),
    steps: [...bid.steps, ...ask.steps],
    scales: { ...(bidScale && { bid: bidScale }), ...(askScale && { ask: askScale }) },
    middle: Number(coordinate(middle)),
    midPrice: bestBid !== undefined && bestAsk !== undefined ? new Decimal(bestBid).plus(bestAsk).div(2).toFixed() : undefined,
    maxCumulative: maxCumulative.toFixed(),
    halfCumulative: maxCumulative.div(2).toFixed(),
    bidTotal,
    askTotal,
    bestBid,
    bestAsk,
    lowestBid: bidSeries.at(-1)?.price,
    highestAsk: askSeries.at(-1)?.price,
  };
};

/** The step under a pointer x: the side is the half the pointer is in; inside the gap it is the nearer best price. */
export const depthStepAt = (geometry: Pick<DepthChartGeometry, 'steps' | 'middle'>, x: number): DepthStep | undefined => {
  const side: DepthSide = x < geometry.middle ? 'bid' : 'ask';
  const steps = geometry.steps.filter((step) => step.side === side);
  // On a shared edge the farther level wins, so the outer edge reads the whole side.
  const inside = [...steps].reverse().find((step) => x >= Math.min(step.from, step.to) && x <= Math.max(step.from, step.to));
  if (inside) return inside;
  const inner = steps[0];
  const beyondInner = inner && (side === 'bid' ? x > inner.from : x < inner.from);
  return beyondInner ? inner : steps.at(-1);
};

/** The price under a pointer x on one half, rounded to the tick; inside the gap it is the best price of that side. */
export const depthPriceAt = (scale: DepthScale, x: number, tick: string): string => {
  const span = new Decimal(scale.outer).minus(scale.inner);
  const along = span.isZero() ? new Decimal(0) : Decimal.min(1, Decimal.max(0, new Decimal(x).minus(scale.inner).div(span)));
  const price = new Decimal(scale.best).plus(new Decimal(scale.farthest).minus(scale.best).times(along));
  return price.toNearest(tick, Decimal.ROUND_HALF_UP).toFixed(new Decimal(tick).decimalPlaces());
};

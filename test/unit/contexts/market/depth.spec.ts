import { describe, expect, test } from 'vitest';
import { bestAsk, bestBid, cumulativeLevels, depthPrecisions, nearestLevels, sortBids, spreadOf } from '@/contexts/market/domain/depth';
import { depthChartGeometry, depthPriceAt, depthStepAt } from '@/contexts/market/domain/depthChart';

const bids = [
  { price: '82900.00', quantity: '12.4' },
  { price: '83000.00', quantity: '5' },
  { price: '82400.00', quantity: '1.75' },
];
const asks = [
  { price: '83400.00', quantity: '6.1' },
  { price: '83100.00', quantity: '1.4' },
];

describe('Depth helpers', () => {
  test('Should find the best bid and ask whatever order the levels come in', () => {
    expect(bestBid(bids)).toBe('83000.00');
    expect(bestAsk(asks)).toBe('83100.00');
  });

  test('Should compute the spread exactly and have none when a side is empty', () => {
    expect(spreadOf('83000.00', '83100.01')).toBe('100.01');
    expect(spreadOf(undefined, '83100.00')).toBeUndefined();
    expect(bestBid([])).toBeUndefined();
  });

  test('Should accumulate quantity from the best price outwards without floating point drift', () => {
    const series = cumulativeLevels(sortBids([...bids, { price: '82000.00', quantity: '0.1' }, { price: '81000.00', quantity: '0.2' }]));

    expect(series.map((level) => level.cumulative)).toEqual(['5', '17.4', '19.15', '19.25', '19.45']);
  });

  test('Should keep only the levels closest to the spread', () => {
    expect(nearestLevels(bids, 'bid', 2).map((level) => level.price)).toEqual(['83000.00', '82900.00']);
    expect(nearestLevels(asks, 'ask', 1).map((level) => level.price)).toEqual(['83100.00']);
  });

  test('Should offer the groupings the backend accepts, as powers of ten', () => {
    expect(depthPrecisions.map((precision) => [precision.value, precision.step])).toEqual([
      [-2, '0.01'],
      [-1, '0.1'],
      [0, '1'],
      [1, '10'],
      [2, '100'],
      [3, '1000'],
    ]);
  });
});

describe('Depth chart geometry', () => {
  const frame = { left: 40, right: 640, top: 10, bottom: 190, gap: 20 };

  test('Should draw bids on the left half and asks on the right, on one quantity scale', () => {
    // When
    const geometry = depthChartGeometry(bids, asks, frame);

    // Then
    expect(geometry.bidPoints).toBe('330,190 330,143 281.7,143 281.7,26.4 40,26.4 40,10 40,10 40,190');
    expect(geometry.askPoints).toBe('350,190 350,176.8 640,176.8 640,119.5 640,119.5 640,190');
    expect(geometry).toMatchObject({ maxCumulative: '19.15', bidTotal: '19.15', askTotal: '7.5', bestBid: '83000.00', bestAsk: '83100.00', lowestBid: '82400.00', highestAsk: '83400.00' });
  });

  test('Should draw nothing for an empty side and stretch a single level to the edge', () => {
    const geometry = depthChartGeometry([], [{ price: '83100.00', quantity: '2' }], frame);

    expect(geometry.bidPoints).toBe('');
    expect(geometry.askPoints).toBe('350,190 350,10 640,10 640,190');
  });

  test('Should give the same shapes as paths: a closed area and the step line on top of it', () => {
    const geometry = depthChartGeometry([], [{ price: '83100.00', quantity: '2' }], frame);

    expect(geometry.askArea).toBe('M350,190 L350,10 L640,10 L640,190 Z');
    expect(geometry.askLine).toBe('M350,10 L640,10');
    expect(geometry.bidArea).toBe('');
    expect(geometry.midPrice).toBeUndefined();
  });

  test('Should put the mid price on the boundary between the halves', () => {
    const geometry = depthChartGeometry(bids, asks, frame);

    expect(geometry.middle).toBe(340);
    expect(geometry.midPrice).toBe('83050');
  });

  test('Should find the step under the pointer on each half, and the best level inside the gap', () => {
    const geometry = depthChartGeometry(bids, asks, frame);

    expect(depthStepAt(geometry, 300)).toMatchObject({ side: 'bid', price: '83000.00', cumulative: '5' });
    expect(depthStepAt(geometry, 100)).toMatchObject({ side: 'bid', price: '82900.00', cumulative: '17.4' });
    expect(depthStepAt(geometry, 335)).toMatchObject({ side: 'bid', price: '83000.00' });
    expect(depthStepAt(geometry, 345)).toMatchObject({ side: 'ask', price: '83100.00', cumulative: '1.4' });
    expect(depthStepAt(geometry, 640)).toMatchObject({ side: 'ask', price: '83400.00', cumulative: '7.5' });
  });

  test('Should turn a pointer x back into a price on the tick', () => {
    const geometry = depthChartGeometry(bids, asks, frame);
    const { bid, ask } = geometry.scales;

    expect(depthPriceAt(ask!, 350, '0.01')).toBe('83100.00');
    expect(depthPriceAt(ask!, 495, '0.01')).toBe('83250.00');
    expect(depthPriceAt(bid!, 40, '0.01')).toBe('82400.00');
    expect(depthPriceAt(bid!, 400, '0.01')).toBe('83000.00');
  });
});

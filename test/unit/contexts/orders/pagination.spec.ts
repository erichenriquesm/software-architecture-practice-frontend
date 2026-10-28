import { describe, expect, test } from 'vitest';
import { pageRangeLabel, pageWindow } from '@/contexts/orders/domain/pagination';

describe('Page window', () => {
  test('Should slice the items of the requested page', () => {
    expect(pageWindow(23, 8, 2)).toEqual({ page: 2, pageCount: 3, start: 8, end: 16, hasPrevious: true, hasNext: true });
    expect(pageRangeLabel(pageWindow(23, 8, 1), 23)).toBe('1–8 de 23');
    expect(pageRangeLabel(pageWindow(23, 8, 3), 23)).toBe('17–23 de 23');
  });

  test('Should clamp a page past the end and a page before the start', () => {
    expect(pageWindow(5, 2, 9)).toMatchObject({ page: 3, start: 4, end: 5, hasNext: false });
    expect(pageWindow(5, 2, 0)).toMatchObject({ page: 1, start: 0, end: 2, hasPrevious: false });
  });

  test('Should keep one page when nothing fits or the list is empty', () => {
    expect(pageWindow(4, 0, 1)).toMatchObject({ page: 1, pageCount: 4, start: 0, end: 1 });
    expect(pageWindow(0, 8, 3)).toMatchObject({ page: 1, pageCount: 1, start: 0, end: 0 });
    expect(pageRangeLabel(pageWindow(0, 8, 1), 0)).toBe('0 de 0');
  });
});

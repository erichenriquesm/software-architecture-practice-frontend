export interface PageWindow {
  /** 1-based page actually shown: the requested one, clamped to the pages that exist. */
  readonly page: number;
  readonly pageCount: number;
  /** Index of the first item shown (0-based, inclusive) and of the one after the last (exclusive). */
  readonly start: number;
  readonly end: number;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
}

/** Which slice of `total` items a page of `size` shows; the page clamps when the list shrinks under it. */
export const pageWindow = (total: number, size: number, requested: number): PageWindow => {
  const perPage = Math.max(1, Math.floor(size));
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, Math.floor(requested)), pageCount);
  const start = (page - 1) * perPage;
  return { page, pageCount, start, end: Math.min(total, start + perPage), hasPrevious: page > 1, hasNext: page < pageCount };
};

/** "1–8 de 23", the range shown by the pager. */
export const pageRangeLabel = (window: PageWindow, total: number): string => (total === 0 ? '0 de 0' : `${window.start + 1}–${window.end} de ${total}`);

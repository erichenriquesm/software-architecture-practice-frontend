import { afterEach, beforeEach, vi } from 'vitest';

/**
 * jsdom has no layout: every box is 0 px tall and there is no ResizeObserver. This gives every element `height` px
 * and an observer that measures once, so the panels that count rows to fit (useFitCount) have room to show them.
 */
export const useFakeLayout = (height: number) => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        readonly callback: ResizeObserverCallback;
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }
        observe() {
          this.callback([], this as unknown as ResizeObserver);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640);
  });
  afterEach(() => vi.unstubAllGlobals());
};

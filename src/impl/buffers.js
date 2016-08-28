// @flow
export const EMPTY: Function = (): Object => ({
  toString(): string {
    return '[object EMPTY]';
  },
});

export class RingBuffer<T> {
  _array: T[];

  constructor() {
    this._array = [];
  }

  unshift(item: T): void {
    this._array.unshift(item);
  }

  pop(): T | typeof EMPTY {
    if (this._array.length === 0) {
      return EMPTY;
    }

    return this._array.pop();
  }

  size(): number {
    return this._array.length;
  }

  cleanup(predicate: Function): void {
    this._array = this._array.filter(predicate);
  }
}

export class FixedBuffer<T> {
  _buffer: RingBuffer<T>;
  _n: number;

  constructor(buffer: RingBuffer<T>, n: number) {
    this._buffer = buffer;
    this._n = n;
  }

  isFull(): boolean {
    return this._buffer.size() >= this._n;
  }

  add(item: T): void {
    this._buffer.unshift(item);
  }

  remove(): T | typeof EMPTY {
    return this._buffer.pop();
  }

  count(): number {
    return this._buffer.size();
  }
}

export class DroppingBuffer<T> {
  _buffer: RingBuffer<T>;
  _n: number;

  constructor(buffer: RingBuffer<T>, n: number) {
    this._buffer = buffer;
    this._n = n;
  }

  isFull(): boolean {
    return false;
  }

  add(item: T): void {
    if (this._buffer.size() < this._n) {
      this._buffer.unshift(item);
    }
  }

  remove(): T | typeof EMPTY {
    return this._buffer.pop();
  }

  count(): number {
    return this._buffer.size();
  }
}

export class SlidingBuffer<T> {
  _buffer: RingBuffer<T>;
  _n: number;

  constructor(buffer: RingBuffer<T>, n: number) {
    this._buffer = buffer;
    this._n = n;
  }

  isFull(): boolean {
    return false;
  }

  add(item: T): void {
    if (this._buffer.size() === this._n) {
      this._buffer.pop();
    }

    this._buffer.unshift(item);
  }

  remove(): T | typeof EMPTY {
    return this._buffer.pop();
  }

  count(): number {
    return this._buffer.size();
  }
}

/**
 * Returns a buffer that is considered "full" when it reaches size n,
 * but still accepts additional items, effectively allow overflowing.
 * The overflowing behavior is useful for supporting "expanding"
 * transducers, where we want to check if a buffer is full before
 * running the transduced step function, while still allowing a
 * transduced step to expand into multiple "essence" steps.
 */
export const ring = <T>(): RingBuffer<T> => // eslint-disable-line
  new RingBuffer();

export const fixed = <T>(n: number): FixedBuffer<T> => // eslint-disable-line
  new FixedBuffer(ring(), n);

export const dropping = <T>(n: number): DroppingBuffer<T> => // eslint-disable-line
  new DroppingBuffer(ring(), n);

export const sliding = <T>(n: number): SlidingBuffer<T> => // eslint-disable-line
  new SlidingBuffer(ring(), n);

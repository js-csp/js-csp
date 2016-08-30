// @flow
export class RingBuffer<T> {
  _array: T[];

  constructor() {
    this._array = [];
  }

  unshift(item: T): void {
    this._array.unshift(item);
  }

  pop(): ?T {
    return this._array.pop();
  }

  count(): number {
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
    return this._buffer.count() >= this._n;
  }

  add(item: T): void {
    this._buffer.unshift(item);
  }

  remove(): ?T {
    return this._buffer.pop();
  }

  count(): number {
    return this._buffer.count();
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
    if (this._buffer.count() < this._n) {
      this._buffer.unshift(item);
    }
  }

  remove(): ?T {
    return this._buffer.pop();
  }

  count(): number {
    return this._buffer.count();
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
    if (this._buffer.count() === this._n) {
      this._buffer.pop();
    }

    this._buffer.unshift(item);
  }

  remove(): ?T {
    return this._buffer.pop();
  }

  count(): number {
    return this._buffer.count();
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
export function ring<T>(): RingBuffer<T> {
  return new RingBuffer();
}

export function fixed<T>(n: number): FixedBuffer<T> {
  return new FixedBuffer(ring(), n);
}

export function dropping<T>(n: number): DroppingBuffer<T> {
  return new DroppingBuffer(ring(), n);
}

export function sliding<T>(n: number): SlidingBuffer<T> {
  return new SlidingBuffer(ring(), n);
}

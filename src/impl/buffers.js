// @flow
export const EMPTY = () => ({
  toString: () => '[Function EMPTY]',
});


class RingBuffer {
  _array: Function[];

  constructor() {
    this._array = [];
  }

  unshift(item: Function): void {
    this._array.unshift(item);
  }

  pop(): Function {
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


class FixedBuffer {
  _buffer: RingBuffer;
  _n: number;

  constructor(buffer: RingBuffer, n: number) {
    this._buffer = buffer;
    this._n = n;
  }

  isFull(): boolean {
    return this._buffer.size() >= this._n;
  }

  remove(): Function {
    return this._buffer.pop();
  }

  add(item: Function): void {
    this._buffer.unshift(item);
  }

  count(): number {
    return this._buffer.size();
  }
}


class DroppingBuffer {
  _buffer: RingBuffer;
  _n: number;

  constructor(buffer: RingBuffer, n: number) {
    this._buffer = buffer;
    this._n = n;
  }

  isFull(): boolean {
    return false;
  }

  remove(): Function {
    return this._buffer.pop();
  }

  add(item: Function): void {
    if (this._buffer.size() < this._n) {
      this._buffer.unshift(item);
    }
  }

  count(): number {
    return this._buffer.size();
  }
}


class SlidingBuffer {
  _buffer: RingBuffer;
  _n: number;

  constructor(buffer: RingBuffer, n: number) {
    this._buffer = buffer;
    this._n = n;
  }

  isFull(): boolean {
    return false;
  }

  remove(): Function {
    return this._buffer.pop();
  }

  add(item: Function): void {
    if (this._buffer.size() === this._n) {
      this._buffer.pop();
    }

    this._buffer.unshift(item);
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
export const ring = (): RingBuffer => new RingBuffer();
export const fixed = (n: number): FixedBuffer => new FixedBuffer(ring(), n);
export const dropping = (n: number): DroppingBuffer => new DroppingBuffer(ring(), n);
export const sliding = (n: number): SlidingBuffer => new SlidingBuffer(ring(), n);

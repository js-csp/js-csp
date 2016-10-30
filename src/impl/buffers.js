// @flow
function acopy<T>(src: Array<T>, srcStart: number,
                  dest: Array<T>, destStart: number,
                  len: number): void {
  for (let count = 0; count < len; count += 1) {
    dest[destStart + count] = src[srcStart + count];
  }
}

export class RingBuffer<T> {
  head: number;
  tail: number;
  length: number;
  arr: Array<?T>;

  constructor(head: number, tail: number, length: number, arr: Array<?T>) {
    this.head = head;
    this.tail = tail;
    this.length = length;
    this.arr = arr;
  }

  pop(): ?T {
    if (this.length !== 0) {
      const elem = this.arr[this.tail];

      this.arr[this.tail] = undefined;
      this.tail = (this.tail + 1) % this.arr.length;
      this.length -= 1;

      return elem;
    }

    return undefined;
  }

  unshift(element: ?T): void {
    this.arr[this.head] = element;
    this.head = (this.head + 1) % this.arr.length;
    this.length += 1;
  }

  unboundedUnshift(element: ?T): void {
    if (this.length + 1 === this.arr.length) {
      this.resize();
    }
    this.unshift(element);
  }

  resize(): void {
    const newArrSize = this.arr.length * 2;
    const newArr = new Array(newArrSize);

    if (this.tail < this.head) {
      acopy(this.arr, this.tail, newArr, 0, this.length);
      this.tail = 0;
      this.head = this.length;
      this.arr = newArr;
    } else if (this.tail > this.head) {
      acopy(this.arr, this.tail, newArr, 0, this.arr.length - this.tail);
      acopy(this.arr, 0, newArr, this.arr.length - this.tail, this.head);
      this.tail = 0;
      this.head = this.length;
      this.arr = newArr;
    } else if (this.tail === this.head) {
      this.tail = 0;
      this.head = 0;
      this.arr = newArr;
    }
  }

  cleanup(predicate: Function): void {
    for (let i = this.length; i > 0; i -= 1) {
      const value = this.pop();

      if (predicate(value)) {
        this.unshift(value);
      }
    }
  }
}

export function ring<T>(n: number): RingBuffer<T> {
  if (n <= 0) {
    throw new Error("Can't create a ring buffer of size 0");
  }

  return new RingBuffer(0, 0, 0, new Array(n));
}

/**
 * Returns a buffer that is considered "full" when it reaches size n,
 * but still accepts additional items, effectively allow overflowing.
 * The overflowing behavior is useful for supporting "expanding"
 * transducers, where we want to check if a buffer is full before
 * running the transduced step function, while still allowing a
 * transduced step to expand into multiple "essence" steps.
 */
export class FixedBuffer<T> {
  buffer: RingBuffer<T>;
  n: number;

  constructor(buffer: RingBuffer<T>, n: number) {
    this.buffer = buffer;
    this.n = n;
  }

  isFull(): boolean {
    return this.buffer.length === this.n;
  }

  remove(): ?T {
    return this.buffer.pop();
  }

  add(item: ?T): void {
    this.buffer.unboundedUnshift(item);
  }

  closeBuffer(): void {} // eslint-disable-line

  count(): number {
    return this.buffer.length;
  }
}

export function fixed<T>(n: number): FixedBuffer<T> {
  return new FixedBuffer(ring(n), n);
}

export class DroppingBuffer<T> {
  buffer: RingBuffer<T>;
  n: number;

  constructor(buffer: RingBuffer<T>, n: number) {
    this.buffer = buffer;
    this.n = n;
  }

  isFull(): boolean { // eslint-disable-line
    return false;
  }

  remove(): ?T {
    return this.buffer.pop();
  }

  add(item: ?T): void {
    if (this.buffer.length !== this.n) {
      this.buffer.unshift(item);
    }
  }

  closeBuffer(): void {} // eslint-disable-line

  count(): number {
    return this.buffer.length;
  }
}

export function dropping<T>(n: number): DroppingBuffer<T> {
  return new DroppingBuffer(ring(n), n);
}

export class SlidingBuffer<T> {
  buffer: RingBuffer<T>;
  n: number;

  constructor(buffer: RingBuffer<T>, n: number) {
    this.buffer = buffer;
    this.n = n;
  }

  isFull(): boolean { // eslint-disable-line
    return false;
  }

  remove(): ?T {
    return this.buffer.pop();
  }

  add(item: ?T): void {
    if (this.buffer.length === this.n) {
      this.remove();
    }

    this.buffer.unshift(item);
  }

  closeBuffer(): void {} // eslint-disable-line

  count(): number {
    return this.buffer.length;
  }
}

export function sliding<T>(n: number): SlidingBuffer<T> {
  return new SlidingBuffer(ring(n), n);
}

export class PromiseBuffer {
  value: mixed;

  static NO_VALUE = '@@PromiseBuffer/NO_VALUE';
  static isUndelivered = (value: mixed) => PromiseBuffer.NO_VALUE === value;

  constructor(value: mixed) {
    this.value = value;
  }

  isFull(): boolean { // eslint-disable-line
    return false;
  }

  remove(): mixed {
    return this.value;
  }

  add(item: mixed): void {
    if (PromiseBuffer.isUndelivered(this.value)) {
      this.value = item;
    }
  }

  closeBuffer(): void {
    if (PromiseBuffer.isUndelivered(this.value)) {
      this.value = null;
    }
  }

  count() {
    return PromiseBuffer.isUndelivered(this.value) ? 0 : 1;
  }
}

export function promise(): PromiseBuffer {
  return new PromiseBuffer(PromiseBuffer.NO_VALUE);
}

export type BufferType<T> = FixedBuffer<T> | DroppingBuffer<T> | SlidingBuffer<T> | PromiseBuffer;

import { assert } from 'chai';
import * as buffers from './../src/impl/buffers';

describe('Fixed buffer', () => {
  it('should work', () => {
    const b = buffers.fixed(2);
    assert.equal(b.count(), 0, 'new buffer is empty');

    b.add('1');
    assert.equal(b.count(), 1);

    b.add('2');
    assert.equal(b.count(), 2);
    assert.equal(b.isFull(), true, 'buffer is full');

    assert.equal(b.remove(), '1');
    assert.equal(b.isFull(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), '2');
    assert.equal(b.count(), 0);
    assert(undefined === b.remove(), 'popping empty buffer gives \'undefined\'');
  });

  it('should allow overflowing', () => {
    const b = buffers.fixed(2);
    b.add('1');
    b.add('2');

    assert.equal(b.isFull(), true, 'buffer is full');
    b.add('3');
    assert.equal(b.buffer.length, 3, 'buffer is full (1 item overflowing)');
    b.add('4');
    assert.equal(b.buffer.length, 4, 'buffer is full (1 item overflowing)');
    b.remove();
    b.remove();
    assert.equal(b.isFull(), true, 'buffer is full (without overflowing)');
    b.remove();
    assert.equal(b.isFull(), false, 'buffer is again not full');
  });
});

describe('Dropping buffer', () => {
  it('should work', () => {
    const b = buffers.dropping(2);
    assert.equal(b.count(), 0, 'new buffer is empty');

    b.add('1');
    assert.equal(b.count(), 1);

    b.add('2');
    assert.equal(b.count(), 2);
    assert.equal(b.isFull(), false, 'dropping buffer is never full');
    assert.doesNotThrow(() => {
      b.add('3');
    }, 'dropping buffer accepts always accept push');
    assert.equal(b.count(), 2);

    assert.equal(b.remove(), '1', 'dropping buffer keeps old items');
    assert.equal(b.isFull(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), '2', 'dropping buffer drops newest item');
    assert.equal(b.count(), 0);
    assert(undefined === b.remove(), 'popping empty buffer gives \'undefined\'');
  });
});

describe('Sliding buffer', () => {
  it('should work', () => {
    const b = buffers.sliding(2);
    assert.equal(b.count(), 0, 'new buffer is empty');

    b.add('1');
    assert.equal(b.count(), 1);

    b.add('2');
    assert.equal(b.count(), 2);
    assert.equal(b.isFull(), false, 'sliding buffer is never full');
    assert.doesNotThrow(() => {
      b.add('3');
    }, 'sliding buffer always accepts push');
    assert.equal(b.count(), 2);

    assert.equal(b.remove(), '2', 'sliding buffer drops oldest item');
    assert.equal(b.isFull(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), '3', 'sliding buffer keeps newest item');
    assert.equal(b.count(), 0);
    assert(undefined === b.remove(), 'popping empty buffer gives \'undefined\'');
  });
});


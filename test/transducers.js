import { assert } from 'chai';
import * as transducers from 'transducers.js';
import { it } from './../src/csp.test-helpers';
import { chan, go, put, take, CLOSED } from './../src/csp';

function inc(x) {
  return x + 1;
}

function even(x) {
  return x % 2 === 0;
}

describe('Transducers', () => {
  describe('map (normal reduction)', () => {
    it('should work', function* () {
      const ch = chan(3, transducers.map(inc));
      go(function* () {
        for (let i = 0; i < 6; i += 1) {
          yield put(ch, i);
        }
      });
      for (let i = 0; i < 6; i += 1) {
        assert.equal((yield take(ch)), inc(i));
      }
    });
  });

  describe('filter (input-supressing reduction)', () => {
    it('should work', function* () {
      const ch = chan(3, transducers.filter(even));
      go(function* () {
        for (let i = 0; i < 6; i += 1) {
          yield put(ch, i);
        }
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), 4);
    });
  });

  describe('take (terminating reduction)', () => {
    it('should work', function* () {
      const ch = chan(1, transducers.take(3));
      go(function* () {
        assert.equal((yield put(ch, 0)), true);
        assert.equal((yield put(ch, 1)), true);
        assert.equal((yield put(ch, 2)), true);
        assert.equal((yield put(ch, 3)), false);
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 1);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), CLOSED);
    });
  });

  describe('drop (stateful reduction)', () => {
    it('should work', function* () {
      const ch = chan(1, transducers.drop(3));
      go(function* () {
        assert.equal((yield put(ch, 0)), true);
        assert.equal((yield put(ch, 1)), true);
        assert.equal((yield put(ch, 2)), true);
        assert.equal((yield put(ch, 3)), true);
        assert.equal((yield put(ch, 4)), true);
      });
      assert.equal((yield take(ch)), 3);
      assert.equal((yield take(ch)), 4);
    });
  });

  describe('cat (expanding reduction)', () => {
    it('should work', function* () {
      const ch = chan(1, transducers.cat);
      go(function* () {
        assert.equal((yield put(ch, [0, 1])), true);
        assert.equal((yield put(ch, [1, 2])), true);
        assert.equal((yield put(ch, [2, 3])), true);
        assert.equal((yield put(ch, [3, 4])), true);
        assert.equal((yield put(ch, [4, 5])), true);
        ch.close();
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 1);
      assert.equal((yield take(ch)), 1);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), 3);
      assert.equal((yield take(ch)), 3);
      assert.equal((yield take(ch)), 4);
      assert.equal((yield take(ch)), 4);
      assert.equal((yield take(ch)), 5);
      assert.equal((yield take(ch)), CLOSED);
    });

    it('should flush correct values to multiple takes in one expansion', function* () {
      let count = 0;
      const ch = chan(1, transducers.cat);

      go(function* () {
        assert.equal(1, (yield take(ch)));
        count += 1;
        assert.equal(count, 1);
      });
      go(function* () {
        assert.equal(2, (yield take(ch)));
        count += 1;
        assert.equal(count, 2);
      });
      go(function* () {
        assert.equal(3, (yield take(ch)));
        count += 1;
        assert.equal(count, 3);
      });

      yield put(ch, [1, 2, 3]);

      yield undefined;
      assert.equal(count, 3);
    });
  });

  describe('partition (gathering reduction)', () => {
    it('should complete when terminated from outside', function* () {
      const ch = chan(1, transducers.partition(2));
      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        yield put(ch, 3);
        yield put(ch, 4);
        yield put(ch, 5);
        ch.close();
      });
      assert.deepEqual((yield take(ch)), [1, 2]);
      assert.deepEqual((yield take(ch)), [3, 4]);
      assert.deepEqual((yield take(ch)), [5]);
      assert.deepEqual((yield take(ch)), CLOSED);
    });

    it('should complete when terminated by an earlier reduction', function* () {
      const ch = chan(1, transducers.compose(transducers.take(5), transducers.partition(2)));
      go(function* () {
        assert.equal((yield put(ch, 1)), true);
        assert.equal((yield put(ch, 2)), true);
        assert.equal((yield put(ch, 3)), true);
        assert.equal((yield put(ch, 4)), true);
        assert.equal((yield put(ch, 5)), true);
        assert.equal((yield put(ch, 6)), false);
      });
      assert.deepEqual((yield take(ch)), [1, 2]);
      assert.deepEqual((yield take(ch)), [3, 4]);
      assert.deepEqual((yield take(ch)), [5]);
      assert.deepEqual((yield take(ch)), CLOSED);
    });

    it('should flush multiple pending puts when a value is taken off the buffer', function* () {
      const ch = chan(1, transducers.partition(3));
      let count = 0;

      yield put(ch, 1);
      yield put(ch, 1);
      yield put(ch, 1);

      go(function* () {
        assert.equal(true, (yield put(ch, 1)));
        count += 1;
        assert.equal(count, 1);
      });
      go(function* () {
        assert.equal(true, (yield put(ch, 1)));
        count += 1;
        assert.equal(count, 2);
      });
      go(function* () {
        assert.equal(true, (yield put(ch, 1)));
        count += 1;
        assert.equal(count, 3);
      });

      yield take(ch);
      yield undefined;

      assert.equal(count, 3);
    });
  });

  describe('partition -> cat (valve)', () => {
    it('should correctly flush multiple pending takes with accumulated values when closing', function* () {
      const ch = chan(1, transducers.compose(transducers.partition(4), transducers.cat));
      let count = 0;

      yield put(ch, 1);
      yield put(ch, 2);
      yield put(ch, 3);

      go(function* () {
        assert.equal((yield take(ch)), 1);
        count += 1;
        assert.equal(count, 1);
      });
      go(function* () {
        assert.equal((yield take(ch)), 2);
        count += 1;
        assert.equal(count, 2);
      });
      go(function* () {
        assert.equal((yield take(ch)), 3);
        count += 1;
        assert.equal(count, 3);
      });

      yield ch.close();
      yield undefined;

      assert.equal(count, 3);
    });
  });
});

/* eslint-disable require-yield */
import _ from 'lodash';
import { assert } from 'chai';
import { it, beforeEach } from './../src/csp.test-helpers';
import { chan, go, put, take, operations } from './../src/csp';

function inc(x) {
  return x + 1;
}

function even(x) {
  return x % 2 === 0;
}

function typeOf(x) {
  return typeof x;
}

function sum(...args) {
  return _.sum(args);
}

// TODO: These are very rudimentary tests. Add more

describe('Operations', () => {
  describe('fromColl', () => {
    it('should work', function* () {
      const ch = operations.fromColl([1, 2, 3, 4]);
      assert.equal(1, (yield take(ch)));
      assert.equal(2, (yield take(ch)));
      assert.equal(3, (yield take(ch)));
      assert.equal(4, (yield take(ch)));
      assert.equal(ch.isClosed(), true);
    });
  });

  describe('into', () => {
    it('should work', function* () {
      const coll = [1, 2, 3];
      const ch = operations.fromColl([4, 5, 6]);
      const result = yield take(operations.into(coll, ch));
      assert.deepEqual(result, [1, 2, 3, 4, 5, 6]);
    });
  });

  describe('onto', () => {
    it('should work', function* () {
      const ch = chan();
      operations.onto(ch, [1, 2, 3, 4]);
      assert.deepEqual(
        [1, 2, 3, 4],
        (yield take(operations.into([], ch)))
      );
    });
  });

  describe('mapFrom', () => {
    it('should work', function* () {
      const result = yield take(
        operations.into(
          [], operations.mapFrom(
            inc, operations.fromColl([1, 2, 3, 4]))));
      assert.deepEqual(result, [2, 3, 4, 5]);
    });
  });

  describe('mapInto', () => {
    it('should work', function* () {
      const dst = chan();
      const src = operations.mapInto(inc, dst);
      operations.onto(src, [1, 2, 3, 4]);
      const result = yield take(operations.into([], dst));
      assert.deepEqual(result, [2, 3, 4, 5]);
    });
  });

  describe('filterFrom', () => {
    it('should work', function* () {
      const result = yield take(
        operations.into(
          [], operations.filterFrom(
            even, operations.fromColl([1, 2, 3, 4, 5, 6]))));
      assert.deepEqual(result, [2, 4, 6]);
    });
  });

  describe('filterInto', () => {
    it('should work', function* () {
      const dst = chan();
      const src = operations.filterInto(even, dst);
      operations.onto(src, [1, 2, 3, 4, 5, 6]);
      const result = yield take(operations.into([], dst));
      assert.deepEqual(result, [2, 4, 6]);
    });
  });

  describe('removeFrom', () => {
    it('should work', function* () {
      const result = yield take(
        operations.into(
          [], operations.removeFrom(
            even, operations.fromColl([1, 2, 3, 4, 5, 6]))));
      assert.deepEqual(result, [1, 3, 5]);
    });
  });

  describe('removeInto', () => {
    it('should work', function* () {
      const dst = chan();
      const src = operations.removeInto(even, dst);
      operations.onto(src, [1, 2, 3, 4, 5, 6]);
      const result = yield take(operations.into([], dst));
      assert.deepEqual(result, [1, 3, 5]);
    });
  });

  describe('mapcatFrom', () => {
    it('should work', function* () {
      const src = operations.fromColl([1, 2, 3, 4]);
      const dst = operations.mapcatFrom(_.range, src);
      const result = yield take(operations.into([], dst));
      assert.deepEqual(result, [0, 0, 1, 0, 1, 2, 0, 1, 2, 3]);
    });
  });

  describe('mapcatInto', () => {
    it('should work', function* () {
      const dst = chan();
      const src = operations.mapcatInto(_.range, dst);
      operations.onto(src, [1, 2, 3, 4]);
      const result = yield take(operations.into([], dst));
      assert.deepEqual(result, [0, 0, 1, 0, 1, 2, 0, 1, 2, 3]);
    });
  });

  describe('pipe', () => {
    it('should work', function* () {
      const dst = chan();
      const src = operations.fromColl([1, 2, 3, 4, 5]);
      operations.pipe(src, dst);
      assert.deepEqual(
        [1, 2, 3, 4, 5],
        (yield take(operations.into([], dst))));
    });
  });

  describe('split', () => {
    it('should work', function* () {
      const src = operations.fromColl([1, 2, 3, 4, 5, 6]);
      const chs = operations.split(even, src, 3, 3);
      const evenCh = chs[0];
      const oddCh = chs[1];
      assert.deepEqual(
        [2, 4, 6],
        (yield take(operations.into([], evenCh))));
      assert.deepEqual(
        [1, 3, 5],
        (yield take(operations.into([], oddCh))));
    });
  });

  describe('reduce', () => {
    it('should work', function* () {
      const src = operations.fromColl([1, 2, 3, 4, 5]);
      const dst = operations.reduce((x, y) => x + y, 0, src);
      assert.equal(15, (yield take(dst)));
    });
  });

  describe('map', () => {
    it('should work', function* () {
      const inputs = [
        operations.fromColl([1, 2, 3, 4, 5, 6]),
        operations.fromColl([1, 2, 3, 4, 5, 6]),
        operations.fromColl([1, 2, 3, 4, 5, 6]),
        operations.fromColl([1, 2, 3, 4, 5, 6]),
      ];
      const output = operations.map(sum, inputs);
      assert.deepEqual(
        [4, 8, 12, 16, 20, 24],
        (yield take(operations.into([], output))));
    });
  });

  describe('merge', () => {
    it('should work', function* () {
      const inputs = [
        operations.fromColl([1, 2, 3]),
        operations.fromColl([1, 2, 3]),
        operations.fromColl([1, 2, 3]),
      ];
      const output = operations.merge(inputs);
      const result = yield take(operations.into([], output));
      assert.deepEqual(
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        result.sort()
      );
    });
  });

  describe('take', () => {
    it('should work without enough values', function* () {
      const src = operations.fromColl([1, 2, 3]);
      const dst = operations.take(10, src);
      assert.deepEqual(
        [1, 2, 3],
        (yield take(operations.into([], dst)))
      );
    });

    it('should work with more than enough values', function* () {
      const src = operations.fromColl([1, 2, 3, 4, 5]);
      const dst = operations.take(3, src);
      assert.deepEqual(
        [1, 2, 3],
        (yield take(operations.into([], dst)))
      );
    });
  });

  describe('unique', () => {
    it('should work', function* () {
      const src = operations.fromColl([1, 2, 2, 3, 4, 4, 4, 5, 6, 6, 6]);
      const dst = operations.unique(src);
      assert.deepEqual(
        [1, 2, 3, 4, 5, 6],
        (yield take(operations.into([], dst))));
    });
  });

  describe('partition', () => {
    it('should work', function* () {
      const src = operations.fromColl([1, 2, 3, 4, 5, 6, 7]);
      const dst = operations.partition(3, src);
      assert.deepEqual(
        [[1, 2, 3], [4, 5, 6], [7]],
        (yield take(operations.into([], dst))));
    });
  });

  describe('partitionBy', () => {
    it('should work', function* () {
      const src = operations.fromColl(['a', 'b', 1, 2, 'c', true, undefined, false]);
      const dst = operations.partitionBy(typeOf, src);
      assert.deepEqual(
        [['a', 'b'], [1, 2], ['c'], [true], [undefined], [false]],
        (yield take(operations.into([], dst)))
      );
    });
  });

  describe('mult', () => {
    // TODO: More tests
    it('should work', function* () {
      const a = chan(4);
      const b = chan(4);
      const src = chan();
      const m = operations.mult(src);
      operations.mult.tap(m, a);
      operations.mult.tap(m, b);
      operations.pipe(operations.fromColl([1, 2, 3, 4]), src);

      assert.deepEqual(
        [1, 2, 3, 4],
        (yield take(operations.into([], a)))
      );
      assert.deepEqual(
        [1, 2, 3, 4],
        (yield take(operations.into([], b)))
      );
    });
  });

  describe('mix', () => {
    let in1;
    let in2;
    let out;
    let takeOut;
    let mixer;

    // Common data for `mix` tests.
    beforeEach(function* () {
      in1 = operations.fromColl([1, 2, 3]);
      in2 = operations.fromColl([4, 5, 6]);
      out = chan();
      takeOut = chan();

      mixer = operations.mix(out);
    });

    it('should work', function* () {
      mixer.admix(in1);
      mixer.admix(in2);

      go(function* () {
        for (let i = 0; i < 6; i += 1) {
          const value = yield take(out);
          yield put(takeOut, value);
        }
        takeOut.close();
      });

      assert.deepEqual(
        [1, 2, 3, 4, 5, 6],
        (yield take(operations.into([], takeOut))).sort()
      );
    });

    describe('#toggle', () => {
      it('should solo', function* () {
        mixer.admix(in1);
        mixer.admix(in2);
        mixer.toggle([[in1, { solo: true }]]);

        go(function* () {
          for (let i = 0; i < 3; i += 1) {
            const value = yield take(out);
            yield put(takeOut, value);
          }
          takeOut.close();
        });

        assert.deepEqual(
          [1, 2, 3],
          (yield take(operations.into([], takeOut))).sort()
        );
      });

      it('should mute', function* () {
        mixer.admix(in1);
        mixer.admix(in2);
        mixer.toggle([[in1, { mute: true }]]);

        go(function* () {
          for (let i = 0; i < 3; i += 1) {
            const value = yield take(out);
            yield put(takeOut, value);
          }
          takeOut.close();
        });

        assert.deepEqual(
          [4, 5, 6],
          (yield take(operations.into([], takeOut))).sort()
        );
      });
    });
  });

  describe('pub-sub', () => {
    // TODO: More tests
    it('should work', function* () {
      const aNums = chan(5);
      const aStrs = chan(5);
      const bNums = chan(5);
      const bStrs = chan(5);
      const src = chan();
      const p = operations.pub(src, typeOf);

      operations.pub.sub(p, 'string', aStrs);
      operations.pub.sub(p, 'string', bStrs);
      operations.pub.sub(p, 'number', aNums);
      operations.pub.sub(p, 'number', bNums);

      operations.pipe(operations.fromColl([1, 'a', 2, 'b', 3, 'c']), src);

      assert.deepEqual(
        [1, 2, 3],
        (yield take(operations.into([], aNums)))
      );
      assert.deepEqual(
        [1, 2, 3],
        (yield take(operations.into([], bNums)))
      );
      assert.deepEqual(
        ['a', 'b', 'c'],
        (yield take(operations.into([], aStrs)))
      );
      assert.deepEqual(
        ['a', 'b', 'c'],
        (yield take(operations.into([], bStrs)))
      );
    });
  });
});


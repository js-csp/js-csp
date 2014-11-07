var assert = require("chai").assert;
var a = require("../src/csp.test-helpers"),
    it = a.it,
    before = a.before,
    afterEach = a.afterEach,
    beforeEach = a.beforeEach;

var csp = require("../src/csp"),
    chan = csp.chan,
    go = csp.go,
    put = csp.put,
    takeAsync = csp.takeAsync,
    putAsync = csp.putAsync,
    take = csp.take,
    CLOSED = csp.CLOSED;

var t = require("transducers.js");

function inc(x) {
  return x + 1;
}

function even(x) {
  return x % 2 === 0;
}

describe("Transducers", function() {
  describe("map (normal reduction)", function() {
    it("should work", function*() {
      var ch = chan(3, t.map(inc));
      go(function*() {
        for (var i = 0; i < 6; i++) {
          yield put(ch, i);
        }
      });
      for (var i = 0; i < 6; i++) {
        assert.equal((yield take(ch)), inc(i));
      }
    });
  });

  describe("filter (input-supressing reduction)", function() {
    it("should work", function*() {
      var ch = chan(3, t.filter(even));
      go(function*() {
        for (var i = 0; i < 6; i++) {
          yield put(ch, i);
        }
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), 4);
    });
  });

  describe("take (terminating reduction)", function() {
    it("should work", function*() {
      var ch = chan(1, t.take(3));
      go(function*() {
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

  describe("drop (stateful reduction)", function() {
    it("should work", function*() {
      var ch = chan(1, t.drop(3));
      go(function*() {
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

  describe("cat (expanding reduction)", function() {
    it("should work", function*() {
      var ch = chan(1, t.cat);
      go(function*() {
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

    it("should flush correct values to multiple takes in one expansion", function* () {
      var count = 0;
      var ch = chan(1, t.cat);

      go(function*() {
        assert.equal(1, (yield take(ch)));
        count += 1;
        assert.equal(count, 1);
      });
      go(function*() {
        assert.equal(2, (yield take(ch)));
        count += 1;
        assert.equal(count, 2);
      });
      go(function*() {
        assert.equal(3, (yield take(ch)));
        count += 1;
        assert.equal(count, 3);
      });

      yield put(ch, [1, 2, 3]);

      yield undefined;
      assert.equal(count, 3);
    });
  });

  describe("partition (gathering reduction)", function() {
    it("should complete when terminated from outside", function*() {
      var ch = chan(1, t.partition(2));
      go(function*() {
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

    it("should complete when terminated by an earlier reduction", function*() {
      var ch = chan(1, t.compose(t.take(5), t.partition(2)));
      go(function*() {
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

    it("should flush multiple pending puts when a value is taken off the buffer", function*() {
      var ch = chan(1, t.partition(3));
      var count = 0;
      var inc = function() {
        count += 1;
      };
      yield put(ch, 1);
      yield put(ch, 1);
      yield put(ch, 1);

      putAsync(ch, 1, inc);
      putAsync(ch, 1, inc);
      putAsync(ch, 1, inc);
      yield take(ch);
      assert.equal(count, 3);
    });
  });
});

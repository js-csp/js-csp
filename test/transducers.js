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
    take = csp.take,
    CLOSED = csp.CLOSED;

var t = require("transducers.js");

function inc(x) {
  return x + 1;
}

function even(x) {
  return x % 2 === 0;
}

// TODO: This should be from transducers.js
function partition(n) {
  return function(xform) {
    var part = new Array(n);
    var i = 0;
    return {
      init: function() {
        return xform.init();
      },
      step: function(result, input) {
        part[i] = input;
        i += 1;
        if (result instanceof t.Reduced) {
          return new t.Reduced(xform.step(result.val, part.slice(0, i - 1)));
        } else {
          if (i === n) {
            var out = part.slice(0, n);
            part = new Array(n);
            i = 0;
            return xform.step(result, out);
          }
        }
        return result;
      },
      result: function(v) {
        if (i > 0) {
          return xform.step(v, part.slice(0, i));
        }
        return xform.result(v);
      }
    };
  };
}

describe("Transducers", function() {
  describe("map (normal reduction)", function() {
    it("should work with buffer", function*() {
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
    it("should work with buffer", function*() {
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
    it("should work with buffer", function*() {
      var ch = chan(1, t.take(3));
      go(function*() {
        assert.equal((yield put(ch, 0)), true);
        assert.equal((yield put(ch, 1)), true);
        assert.equal((yield put(ch, 2)), true);
        // FIX: It says "take(3)", but the 4th put still gets "true".
        // See https://github.com/jlongster/transducers.js/issues/9
        assert.equal((yield put(ch, 3)), true);
        assert.equal((yield put(ch, 4)), false);
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 1);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), CLOSED);
    });
  });

  describe("drop (stateful reduction)", function() {
    it("should work with buffer", function*() {
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

    it("should flush multiple takes when flushing a chunk", function* () {
      var count = 0;
      var ch = chan(1, t.cat);
      takeAsync(ch, function() {
        count += 1;
      });
      takeAsync(ch, function() {
        count += 1;
      });
      takeAsync(ch, function() {
        count += 1;
      });
      yield put(ch, [1, 2, 3]);
      assert.equal(count, 3);
    });
  });

  describe("partition (completing reduction)", function() {
    it("should complete when terminated from outside", function*() {
      var ch = chan(1, partition(2));
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
      var ch = chan(1, t.compose(t.take(5), partition(2)));
      go(function*() {
        assert.equal((yield put(ch, 1)), true);
        assert.equal((yield put(ch, 2)), true);
        assert.equal((yield put(ch, 3)), true);
        assert.equal((yield put(ch, 4)), true);
        assert.equal((yield put(ch, 5)), true);
        // FIX: take(5) closes this, so it should be false. TODO: This
        // should have its own test
        yield put(ch, 6);
      });
      assert.deepEqual((yield take(ch)), [1, 2]);
      assert.deepEqual((yield take(ch)), [3, 4]);
      assert.deepEqual((yield take(ch)), [5]);
      assert.deepEqual((yield take(ch)), CLOSED);
    });
  });
});

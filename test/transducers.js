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
    it("should work without buffer", function*() {
      var ch = chan(null, t.map(inc));
      go(function*() {
        for (var i = 0; i < 6; i++) {
          yield put(ch, i);
        }
      });
      for (var i = 0; i < 6; i++) {
        assert.equal((yield take(ch)), inc(i));
      }
    });

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
    it("should work without buffer", function*() {
      var ch = chan(null, t.filter(even));
      go(function*() {
        for (var i = 0; i < 6; i++) {
          yield put(ch, i);
        }
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), 4);
    });

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
    it("should work without buffer", function*() {
      var ch = chan(null, t.take(3));
      go(function*() {
        assert.equal((yield put(ch, 0)), true);
        assert.equal((yield put(ch, 1)), true);
        assert.equal((yield put(ch, 2)), true);
        assert.equal((yield put(ch, 3)), true);
        assert.equal((yield put(ch, 4)), false);
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 1);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), CLOSED);
    });

    it("should work with buffer", function*() {
      var ch = chan(1, t.take(3));
      go(function*() {
        assert.equal((yield put(ch, 0)), true);
        assert.equal((yield put(ch, 1)), true);
        assert.equal((yield put(ch, 2)), true);
        assert.equal((yield put(ch, 3)), true);
        assert.equal((yield put(ch, 4)), false);
      });
      assert.equal((yield take(ch)), 0);
      assert.equal((yield take(ch)), 1);
      assert.equal((yield take(ch)), 2);
      assert.equal((yield take(ch)), CLOSED);
    });
  });
});

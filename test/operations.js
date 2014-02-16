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
    alts = csp.alts,
    wait = csp.wait,
    buffers = csp.buffers,
    CLOSED = csp.CLOSED;

var ops = require("../src/csp.operations");

function inc(x) {
  return x + 1;
}

function even(x) {
  return x % 2 === 0;
}

describe("Operations", function() {
  describe("fromColl", function() {
    it("should work", function*() {
      var ch = ops.fromColl([1, 2, 3, 4]);
      assert.equal(1, (yield take(ch)));
      assert.equal(2, (yield take(ch)));
      assert.equal(3, (yield take(ch)));
      assert.equal(4, (yield take(ch)));
      assert.equal(ch.is_closed(), true);
    });
  });

  describe("into", function() {
    it("should work", function*() {
      var coll = [1, 2, 3];
      var ch = ops.fromColl([4, 5, 6]);
      var result = yield take(ops.into(coll, ch));
      assert.deepEqual(result, [1, 2, 3, 4, 5, 6]);
    });
  });

  describe("mapFrom", function() {
    it("should work", function*() {
      var result = yield take(
        ops.into(
          [], ops.mapFrom(
            inc, ops.fromColl([1, 2, 3, 4]))));
      assert.deepEqual(result, [2, 3, 4, 5]);
    });
  });

  describe("mapInto", function() {
    it("should work", function*() {
      var dst = chan();
      var src = ops.mapInto(inc, dst);
      ops.onto(src, [1, 2, 3, 4]);
      var result = yield take(ops.into([], dst));
      assert.deepEqual(result, [2, 3, 4, 5]);
    });
  });

  describe("filterFrom", function() {
    it("should work", function*() {
      var result = yield take(
        ops.into(
          [], ops.filterFrom(
            even, ops.fromColl([1, 2, 3, 4, 5, 6]))));
      assert.deepEqual(result, [2, 4, 6]);
    });
  });

  describe("filterInto", function() {
    it("should work", function*() {
      var dst = chan();
      var src = ops.filterInto(even, dst);
      ops.onto(src, [1, 2, 3, 4, 5, 6]);
      var result = yield take(ops.into([], dst));
      assert.deepEqual(result, [2, 4, 6]);
    });
  });

  describe("removeFrom", function() {
    it("should work", function*() {
      var result = yield take(
        ops.into(
          [], ops.removeFrom(
            even, ops.fromColl([1, 2, 3, 4, 5, 6]))));
      assert.deepEqual(result, [1, 3, 5]);
    });
  });

  describe("removeInto", function() {
    it("should work", function*() {
      var dst = chan();
      var src = ops.removeInto(even, dst);
      ops.onto(src, [1, 2, 3, 4, 5, 6]);
      var result = yield take(ops.into([], dst));
      assert.deepEqual(result, [1, 3, 5]);
    });
  });
});

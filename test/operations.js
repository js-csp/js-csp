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
    sleep = csp.sleep,
    buffers = csp.buffers,
    CLOSED = csp.CLOSED;

var ops = csp.operations;

function inc(x) {
  return x + 1;
}

function even(x) {
  return x % 2 === 0;
}

function sum() {
  var args = Array.prototype.slice.call(arguments),
      length = args.length,
      s = 0;
  for (var i = 0; i < length; i++) {
    s += args[i];
  }
  return s;
}

function range(n) {
  var r = new Array(n);
  for (var i = 0; i < n; i++) {
    r[i] = i;
  }
  return r;
}

function typeOf(x) {
  return typeof x;
}

// TODO: These are very rudimentary tests. Add more

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

  describe("onto", function() {
    it("should work", function*() {
      var ch = chan();
      ops.onto(ch, [1, 2, 3, 4]);
      assert.deepEqual(
        [1, 2, 3, 4],
        (yield take(ops.into([], ch)))
      );
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

  describe("mapcatFrom", function() {
    it("should work", function*() {
      var src = ops.fromColl([1, 2, 3, 4]);
      var dst = ops.mapcatFrom(range, src);
      var result = yield take(ops.into([], dst));
      assert.deepEqual(result, [0, 0, 1, 0, 1, 2, 0, 1, 2, 3]);
    });
  });

  describe("mapcatInto", function() {
    it("should work", function*() {
      var dst = chan();
      var src = ops.mapcatInto(range, dst);
      ops.onto(src, [1, 2, 3, 4]);
      var result = yield take(ops.into([], dst));
      assert.deepEqual(result, [0, 0, 1, 0, 1, 2, 0, 1, 2, 3]);
    });
  });

  describe("pipe", function() {
    it("should work", function*() {
      var dst = chan();
      var src = ops.fromColl([1, 2, 3, 4, 5]);
      ops.pipe(src, dst);
      assert.deepEqual(
        [1, 2, 3, 4, 5],
        (yield take(ops.into([], dst))));
    });
  });

  describe("split", function() {
    it("should work", function*() {
      var src = ops.fromColl([1, 2, 3, 4, 5, 6]);
      var chs = ops.split(even, src, 3, 3);
      var evenCh = chs[0],
          oddCh = chs[1];
      assert.deepEqual(
        [2, 4, 6],
        (yield take(ops.into([], evenCh))));
      assert.deepEqual(
        [1, 3, 5],
        (yield take(ops.into([], oddCh))));
    });
  });

  describe("reduce", function() {
    it("should work", function*() {
      var src = ops.fromColl([1, 2, 3, 4, 5]);
      var dst = ops.reduce(function(x, y) {
        return x + y;
      }, 0, src);
      assert.equal(15, (yield take(dst)));
    });
  });

  describe("map", function() {
    it("should work", function*() {
      var inputs = [
        ops.fromColl([1, 2, 3, 4, 5, 6]),
        ops.fromColl([1, 2, 3, 4, 5, 6]),
        ops.fromColl([1, 2, 3, 4, 5, 6]),
        ops.fromColl([1, 2, 3, 4, 5, 6])
      ];
      var output = ops.map(sum, inputs);
      assert.deepEqual(
        [4, 8, 12, 16, 20, 24],
        (yield take(ops.into([], output))));
    });
  });

  describe("merge", function() {
    it("should work", function*() {
      var inputs = [
        ops.fromColl([1, 2, 3]),
        ops.fromColl([1, 2, 3]),
        ops.fromColl([1, 2, 3])
      ];
      var output = ops.merge(inputs);
      var result = yield take(ops.into([], output));
      assert.deepEqual(
        [1, 1, 1, 2, 2, 2, 3, 3, 3],
        result.sort()
      );
    });
  });

  describe("take", function() {
    it("should work without enough values", function*() {
      var src = ops.fromColl([1, 2, 3]);
      var dst = ops.take(10, src);
      assert.deepEqual(
        [1, 2, 3],
        (yield take(ops.into([], dst)))
      );
    });

    it("should work with more than enough values", function*() {
      var src = ops.fromColl([1, 2, 3, 4, 5]);
      var dst = ops.take(3, src);
      assert.deepEqual(
        [1, 2, 3],
        (yield take(ops.into([], dst)))
      );
    });
  });

  describe("unique", function() {
    it("should work", function*() {
      var src = ops.fromColl([1, 2, 2, 3, 4, 4, 4, 5, 6, 6, 6]);
      var dst = ops.unique(src);
      assert.deepEqual(
        [1, 2, 3, 4, 5, 6],
        (yield take(ops.into([], dst))));
    });
  });

  describe("partition", function() {
    it("should work", function*() {
      var src = ops.fromColl([1, 2, 3, 4, 5, 6, 7]);
      var dst = ops.partition(3, src);
      assert.deepEqual(
        [[1, 2, 3], [4, 5, 6], [7]],
        (yield take(ops.into([], dst))));
    });
  });

  describe("partitionBy", function() {
    it("should work", function*() {
      var src = ops.fromColl(["a", "b", 1, 2, "c", true, undefined, false]);
      var dst = ops.partitionBy(typeOf, src);
      assert.deepEqual(
        [["a", "b"], [1, 2], ["c"], [true], [undefined], [false]],
        (yield take(ops.into([], dst)))
      );
    });
  });

  describe("mult", function() {
    // TODO: More tests
    it("should work", function*() {
      var a = chan(4);
      var b = chan(4);
      var src = chan();
      var m = ops.mult(src);
      ops.mult.tap(m, a);
      ops.mult.tap(m, b);
      ops.pipe(ops.fromColl([1, 2, 3, 4]), src);

      assert.deepEqual(
        [1, 2, 3, 4],
        (yield take(ops.into([], a)))
      );
      assert.deepEqual(
        [1, 2, 3, 4],
        (yield take(ops.into([], b)))
      );
    });
  });

  describe("mix", function() {
    it("should work", function*() {
      var out = chan();
      var m = ops.mix(out);
      var take_out = chan();
      go(function*() {
        for (var i = 0; i < 6; i++) {
          var value = yield take(out);
          yield put(take_out, value);
        }
        take_out.close();
      });
      var in1 = ops.fromColl([1, 2, 3]);
      var in2 = ops.fromColl([4, 5, 6]);
      ops.mix.add(m, in1);
      ops.mix.add(m, in2);
      ops.mix.toggle(m, [[in1, {solo: true}], [in2, {solo: true}]]);
      assert.deepEqual(
        [1, 2, 3, 4, 5, 6],
        (yield take(ops.into([], take_out))).sort()
      );
    });
  });

  describe("pub-sub", function() {
    // TODO: More tests
    it("should work", function*() {
      var a_nums = chan(5);
      var a_strs = chan(5);
      var b_nums = chan(5);
      var b_strs = chan(5);
      var src = chan();
      var p = ops.pub(src, typeOf);

      ops.pub.sub(p, "string", a_strs);
      ops.pub.sub(p, "string", b_strs);
      ops.pub.sub(p, "number", a_nums);
      ops.pub.sub(p, "number", b_nums);

      ops.pipe(ops.fromColl([1, "a", 2, "b", 3, "c"]), src);

      assert.deepEqual(
        [1, 2, 3],
        (yield take(ops.into([], a_nums)))
      );
      assert.deepEqual(
        [1, 2, 3],
        (yield take(ops.into([], b_nums)))
      );
      assert.deepEqual(
        ["a", "b", "c"],
        (yield take(ops.into([], a_strs)))
      );
      assert.deepEqual(
        ["a", "b", "c"],
        (yield take(ops.into([], b_strs)))
      );
    });
  });
});

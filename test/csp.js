var assert = require("chai").assert;
var a = require("../src/csp.test-helpers"),
    it = a.it,
    before = a.before,
    beforeEach = a.beforeEach;

var csp = require("../src/csp");
var chan = csp.chan;
var go = csp.go;
var put = csp.put;
var take = csp.take;
var alts = csp.alts;
var stop = csp.stop;
var buffers = csp.buffers;

function arrayEqual(arr1, arr2) {
  var length = arr1;
  for (var i = 0; i < length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

describe("put", function() {
  it("should return whether channel was open", function*() {
    var ch = chan(1);
    assert.equal((yield put(ch, 42)), true, "put returns true for open channel");
    ch.close();
    assert.equal((yield put(ch, 43)), false, "put returns false for closed channel");
  });
});

describe("alts", function() {
  it("should work with identity channel", function*() {
    var ch = a.identity_chan(42);
    var r = yield alts([ch]);
    assert.equal(r.value, 42);
    assert.equal(r.channel, ch);
  });

  // FIX: These tests are bad (having (small) chances to pass/fail
  // incorrectly)
  describe("ordering", function() {
    var n = 20;
    var chs = new Array(n);
    var sequential = new Array(n);

    before(function*() {
      for (var i = 0; i < n; i++) {
        sequential[i] = i;
      }
    });

    beforeEach(function*() {
      for (var i = 0; i < n; i++) {
        var ch = chan(1);
        chs[i] = ch;
        yield put(chs[i], i);
      }
    });

    it("should be non-deterministic by default", function*() {
      var results = new Array(n);
      for (var i = 0; i < n; i++) {
        results[i] = (yield alts(chs)).value;
      }
      assert.notDeepEqual(sequential, results, "alts ordering is randomized");
    });

    it("should follow priority if requested", function*() {
      var results = new Array(n);
      for (var i = 0; i < n; i++) {
        results[i] = (yield alts(chs, {priority: true})).value;
      }
      assert.deepEqual(sequential, results, "alts ordering is fixed if priority option is specified");
    });
  });
});

describe("Process runner", function() {
  // TODO: See if this is sufficiently large for all the runtimes (js
  // can't query stack depth)
  var LIMIT = 25000;
  var ch = chan();
  ch.close();

  it("should not blow the stack on repeated takes from a closed channel", function*() {
    for (var i = 0; i < LIMIT; i++) {
      yield take(ch);
    }
  });

  it("should not blow the stack on repeated puts on a closed channel", function*() {
    for (var i = 0; i < LIMIT; i++) {
      yield put(ch, 1);
    }
  });

  it("should not blow the stack on repeated selects on a closed channel", function*() {
    for (var i = 0; i < LIMIT; i++) {
      yield alts([ch, [ch, 1]]);
    }
  });
});

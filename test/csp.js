var assert = require("chai").assert;
var mocha = require("mocha");
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
    putAsync = csp.putAsync,
    takeAsync = csp.takeAsync,
    alts = csp.alts,
    sleep = csp.sleep,
    timeout = csp.timeout,
    buffers = csp.buffers,
    CLOSED = csp.CLOSED;

describe("put", function() {
  describe("that is immediate", function() {
    it("should return true if value is taken", function*() {
      var ch = chan();
      go(function*() {
        yield take(ch);
      });
      assert.equal((yield put(ch, 42)), true);
    });

    it("should return true if value is buffered", function*() {
      var ch = chan(1);
      assert.equal((yield put(ch, 42)), true);
    });

    it("should return false if channel is already closed", function*() {
      var ch = chan();
      ch.close();
      assert.equal((yield put(ch, 42)), false);
    });
  });

  describe("that is parked", function() {
    it("should return true if value is then taken", function*() {
      var ch = chan();
      go(function*() {
        yield sleep(5);
        yield take(ch);
      });
      assert.equal((yield put(ch, 42)), true);
    });

    // it("should return true if value is then buffered", function*() {
    //   var ch = chan(1);
    //   var buffered = false;

    //   go(function*() {
    //     yield put(ch, 42);
    //   });
    //   go(function*() {
    //     assert.equal((yield put(ch, 43)), true);
    //     buffered = true;
    //   });

    //   yield take(ch);

    //   // So that the code after the 43-put has the chance to run
    //   yield 1;

    //   assert.equal(buffered, true, "pending put is buffered once the buffer is not full again");
    // });

    it("should return false if channel is then closed", function*() {
      var ch = chan();

      go(function*() {
        yield sleep(5);
        ch.close();

        // XXX FIX: Throwing an exception here (in a "non-top-level"
        // goroutine) makes the alts test crash with a weird "Cannot
        // call method '_take' of undefined". It goes away if
        // Process.prototype.run handles exceptions throw by the
        // generator. It looks like it has to do with mocha's "done"
        // needs to be called for async test to be cleanedly cleaned
        // up. Yikes! Another way to handle it is to catch the
        // exception and call "done" in the test helpers. Actually no,
        // it makes the next tests incorrect. The problem is exception
        // from "non-top-level" goroutines not being handled. Not sure
        // how to fix yet. throw new Error("Ha ha");
      });

      assert.equal((yield put(ch, 42)), false);
    });

    // http://onbeyondlambda.blogspot.com/2014/04/asynchronous-naivete.html
    mocha.it("should be moved to the buffer when a value is taken from it", function(done) {
      var ch = chan(1);
      var count = 0;

      function inc() {
        count ++;
      }

      putAsync(ch, 42, inc);
      putAsync(ch, 42, inc);
      takeAsync(ch, function() {
        go(function*() {
          yield take(timeout(500));
          assert.equal(count, 2);
          done();
        });
      });
    });
  });
});

describe("take", function() {
  describe("that is immediate", function() {
    it("should return correct value that was directly put", function*() {
      var ch = chan();
      go(function*() {
        yield put(ch, 42);
      });
      assert.equal((yield take(ch)), 42);
    });

    it("should return correct value that was buffered", function*() {
      var ch = chan(1);
      yield put(ch, 42);
      assert.equal((yield take(ch)), 42);
    });

    it("should return false if channel is already closed", function*() {
      var ch = chan();
      ch.close();
      assert.equal((yield take(ch)), CLOSED);
    });
  });

  describe("that is parked", function() {
    it("should return correct value if it is then delivered", function*() {
      var ch = chan();
      go(function*() {
        yield sleep(5);
        yield put(ch, 42);
      });
      assert.equal((yield take(ch)), 42);
    });

    it("should return CLOSED if channel is then closed", function*() {
      var ch = chan();

      go(function*() {
        yield sleep(5);
        ch.close();
      });

      assert.equal((yield take(ch)), CLOSED);
    });
  });
});

describe("alts", function() {
  it("should work with identity channel", function*() {
    var ch = a.identity_chan(42);
    var r = yield alts([ch]);
    assert.equal(r.value, 42);
    assert.equal(r.channel, ch);
  });

  describe("default value", function() {
    var ch;

    before(function*() {
      ch = chan(1);
    });

    it("should be returned if no result is immediately available", function*() {
      var r = yield alts([ch], {default: "none"});
      assert.equal(r.value, "none");
      assert.equal(r.channel, csp.DEFAULT);
    });

    it("should be ignored if some result is immediately available", function*() {
      yield put(ch, 1);
      var r = yield alts([ch], {default: "none"});
      assert.equal(r.value, 1);
      assert.equal(r.channel, ch);
    });
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

describe("Goroutine", function() {
  it("should put returned value on output channel and close it", function*() {
    var ch = go(function*(x) {
      return x;
    }, [42], true);
    var value = yield take(ch);
    assert.equal(value, 42, "returned value is delivered");
    assert.equal(ch.is_closed(), true, "output channel is closed");
  });

  it("should leave yielded normal values untouched", function*() {
    var lst = [42, [42], {x: 42}, "", null, undefined, true, false,
               function() {}, function*() {}];
    var length = lst.length;
    for (var i = 0; i < length; i++) {
      assert.equal((yield lst[i]), lst[i]);
    }
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

  it("should not blow the stack on repeated puts and takes that are immediate", function*() {
    var ch = chan(1);
    for (var i = 0; i < LIMIT; i++) {
      yield put(ch, 1);
      yield take(ch);
    }
  });
});

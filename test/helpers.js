var assert = require("chai").assert;
var a = require("../src/csp.test-helpers");

var csp = require("../src/csp");
var go = csp.go;

describe("Test helpers", function() {
  var running = false;
  var started = false;
  // FIX: "after" is not tested yet

  a.before(function*() {
    started = true;
  });

  a.after(function*() {
    assert.equal(started, true);
  });

  a.beforeEach(function*() {
    assert.equal(started, true, "'before' hook was run");
    assert.equal(running, false, "last 'afterEach' hook was run");
    running = true;
  });

  a.afterEach(function*() {
    assert.equal(started, true, "'before' hook was run");
    assert.equal(running, true, "'beforeEach' hook was run");
    running = false;
  });

  it("should run with no sugar", function(done) {
    go(function*() {
      a.check(function() {
        assert.equal(running, true, "'beforeEach' hook was run");
      }, done);
    });
  });

  it("should run with 1 layer of sugar", a.goAsync(function*(done) {
    a.check(function() {
      assert.equal(running, true, "'beforeEach' hook was run");
    }, done);
  }));

  it("should run with 2 layers of sugar", a.go(function*() {
    assert.equal(running, true, "'beforeEach' hook was run");
  }));

  a.it("should run with 3 layers of sugar", function*() {
    assert.equal(running, true, "'beforeEach' hook was run");
  });
});

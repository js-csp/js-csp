var assert = require("chai").assert;
var a = require("../src/csp.test-helpers");

var csp = require("../src/csp");
var go = csp.go;

describe("Test helpers", function() {
  it("should run with no sugar", function(done) {
    go(function*() {
      assert(true);
      done();
    });
  });

  it("should run with 1 layer of sugar", a.go(function*(done) {
    assert(true);
    done();
  }));

  a.it("should run with 2 layers of sugar", function*() {
    assert(true);
  });
});

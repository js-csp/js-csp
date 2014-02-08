var assert = require("chai").assert;

var a = require("../test_helpers");

var csp = require("../csp");
var go = csp.go;

describe("Test helpers", function() {
  it("should work bare", function(done) {
    go(function*() {
      assert(true);
      done();
    });
  });

  it("should work with 1 layer of sugar", a.go(function*(done) {
    assert(true);
    done();
  }));

  a.it("should work with 2 layers of sugar", function*() {
    assert(true);
  });
});

var assert = require("chai").assert;

var a = require("../test_helpers");

var csp = require("../csp");
var chan = csp.chan;
var go = csp.go;
var put = csp.put;
var take = csp.take;
var alts = csp.alts;
var buffers = csp.buffers;

describe("alts", function() {
  a.it("should work with identity channel", function*() {
    var ch = a.identity_chan(42);
    var r = yield alts([ch]);
    assert.equal(r.value, 42);
    assert.equal(r.channel, ch);
  });
});

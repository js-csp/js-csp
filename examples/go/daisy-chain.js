"use strict";

// http://talks.golang.org/2012/concurrency.slide#39
// Daisy-chain
var csp = require("../../src/csp");

function* chain(left, right) {
  yield csp.put(left, 1 + (yield csp.take(right)));
}

csp.go(function*() {
  var n = 100000;
  var leftmost = csp.chan();
  var right = leftmost;
  var left = leftmost;

  // Start the goroutines
  for (var i = 0; i < n; i++) {
    right = csp.chan();
    csp.go(chain, [left, right]);
    left = right;
  }

  // Start the chain
  csp.go(function*() {
    yield csp.put(right, 1);
  });

  console.log((yield csp.take(leftmost)));
});

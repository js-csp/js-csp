"use strict";

// http://talks.golang.org/2012/concurrency.slide#35
// Timeout using select

var csp = require("../../src/csp");
var boring = require("./boring");

csp.go(function*() {
  var b = boring("boring!");

  while (true) {
    var r = yield csp.alts([b, csp.timeout(800)]);
    if (r.channel === b) {
      console.log(r.value);
    } else {
      console.log("You're too slow");
      break;
    }
  }
});

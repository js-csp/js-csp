"use strict";

// http://talks.golang.org/2012/concurrency.slide#36
// Timeout using select

var csp = require("../../src/csp");
var boring = require("./boring");

csp.go(function*() {
  var b = boring("boring!");
  var t = csp.timeout(2000);

  while (true) {
    var r = yield csp.alts([b, t]);
    if (r.channel === b) {
      console.log(r.value);
    } else {
      console.log("You talk too much.");
      break;
    }
  }
});

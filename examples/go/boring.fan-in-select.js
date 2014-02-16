"use strict";

// http://talks.golang.org/2012/concurrency.slide#34
// Fan-in using select

var csp = require("../../src/csp");
var boring = require("./boring");

function fanIn(input1, input2) {
  var ch = csp.chan();
  csp.go(function*() {
    for (;;) {
      var r = yield csp.alts([input1, input2]);
      yield csp.put(ch, r.value);
    }
  });
  return ch;
}

csp.go(function*() {
  var ch = fanIn(boring("Joe"), boring("Ann"));
  for (var i = 0; i < 10; i++) {
    console.log((yield csp.take(ch)));
  }
  console.log( "You are boring; I'm leaving.");
  process.exit();
});

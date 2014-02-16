"use strict";

// http://talks.golang.org/2012/concurrency.slide#27
// Multiplexing

var csp = require("../../src/csp");
var boring = require("./boring");

function fanIn(input1, input2) {
  var ch = csp.chan();
  function* collect(input) {
    for (;;) { yield csp.put(ch, (yield csp.take(input))); }
  }
  csp.go(collect, [input1]);
  csp.go(collect, [input2]);
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

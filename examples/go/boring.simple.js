"use strict";

// http://talks.golang.org/2012/concurrency.slide#25
// Function returning channel

var csp = require("../../src/csp");
var boring = require("./boring");

csp.go(function*() {
  var b = boring("boring!");
  for (var i = 0; i < 5; i++) {
    console.log("You say: " + (yield csp.take(b)));
  }
  console.log("You are boring; I'm leaving.");
});

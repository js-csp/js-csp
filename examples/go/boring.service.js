"use strict";

// http://talks.golang.org/2012/concurrency.slide#26
// Channels as a handle on a service

var csp = require("../../src/csp");
var boring = require("./boring");

csp.go(function*() {
  var joe = boring("Joe");
  var ann = boring("Ann");
  for (var i = 0; i < 5; i++) {
    console.log((yield csp.take(joe)));
    console.log((yield csp.take(ann)));
  }
  console.log("You are boring; I'm leaving.");
});

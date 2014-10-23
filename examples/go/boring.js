"use strict";

var csp = require("../../src/csp");

module.exports = function boring(message) {
  var ch = csp.chan();
  csp.go(function*() {
    for (var i = 0;; i++) {
      yield csp.put(ch, message + " " + i);
      yield csp.timeout(Math.random() * 1000);
    }
  });
  return ch;
};

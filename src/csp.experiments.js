"use strict";

var csp = require("./csp.core"),
    chan = csp.chan,
    buffers = csp.buffers,
    putAsync = csp.putAsync;

function fromEvent(element, eventName, ch) {
  // FIX: buffers.sliding(0) would make more sense, if it worked.
  ch = ch || chan(buffers.sliding(1));
  element.addEventListener(eventName, function(event) {
    putAsync(ch, event);
  });
  return ch;
}

module.exports = {
  fromEvent: fromEvent
};

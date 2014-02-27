"use strict";

var buffers = require("./impl/buffers");
var channels = require("./impl/channels");
var select = require("./impl/select");
var process = require("./impl/process");
var timers = require("./impl/timers");

function spawn(gen, returnChannel) {
  if (returnChannel) {
    var ch = channels.chan(buffers.fixed(1));
    (new process.Process(gen, function(value) {
      process.put_then_callback(ch, value, function(ok) {
        ch.close();
      });
    })).run();
    return ch;
  } else {
    (new process.Process(gen)).run();
    return null;
  }
};

function go(f, args, returnChannel) {
  var gen = f.apply(null, args);
  return spawn(gen, returnChannel);
};

function chan(bufferOrNumber) {
  var buf;
  if (bufferOrNumber === 0) {
    bufferOrNumber = null;
  }
  if (typeof bufferOrNumber === "number") {
    buf = buffers.fixed(bufferOrNumber);
  } else {
    buf = bufferOrNumber;
  }
  return channels.chan(buf);
};


module.exports = {
  buffers: {
    fixed: buffers.fixed,
    dropping: buffers.dropping,
    sliding: buffers.sliding
  },

  spawn: spawn,
  go: go,
  chan: chan,
  DEFAULT: select.DEFAULT,
  CLOSED: channels.CLOSED,

  put: process.put,
  take: process.take,
  sleep: process.sleep,
  alts: process.alts,
  putAsync: process.put_then_callback,
  takeAsync: process.take_then_callback,

  timeout: timers.timeout
};

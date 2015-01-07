"use strict";

var buffers = require("./impl/buffers");
var channels = require("./impl/channels");
var select = require("./impl/select");
var process = require("./impl/process");
var timers = require("./impl/timers");
var config = require("./impl/config");
var dispatch = require("./impl/dispatch");

function spawn(gen, opts) {
  opts = opts || {};
  var ch = channels.chan(buffers.fixed(1));
  (new process.Process(gen, opts, function(value) {
    if (value === channels.CLOSED) {
      ch.close();
    } else {
      process.put_then_callback(ch, value, function(ok) {
        ch.close();
      });
    }
  })).run();
  return ch;
};

function go(f, opts) {
  opts = opts || {};
  opts.creator = f;
  return spawn(f(), opts);
};

function chan(bufferOrNumber, xform, exHandler) {
  var buf;
  if (bufferOrNumber === 0) {
    bufferOrNumber = null;
  }
  if (typeof bufferOrNumber === "number") {
    buf = buffers.fixed(bufferOrNumber);
  } else {
    buf = bufferOrNumber;
  }
  return channels.chan(buf, xform, exHandler);
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
  takePropagate: process.takePropagate,
  sleep: process.sleep,
  alts: process.alts,
  putAsync: process.put_then_callback,
  takeAsync: process.take_then_callback,
  Throw: process.Throw,

  timeout: timers.timeout,
  stackHistory: config.setters.stackHistory,
  setDefaultExceptionHandler: process.setDefaultExceptionHandler
};

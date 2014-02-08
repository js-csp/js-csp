var buffers = require("./impl/buffers");
var channels = require("./impl/channels");
var process = require("./impl/process");
var timers = require("./impl/timers");

function no_op() {
};

var spawn = exports.spawn = function spawn(gen, returnChannel) {
  if (returnChannel) {
    var chan = channels.chan(buffers.fixed(1));
    (new process.Process(gen, function(value) {
      // TODO: Shouldn't we close this channel instead of leaving it open?
      process.put_then_callback(chan, value, no_op);
    })).run();
    return chan;
  } else {
    (new process.Process(gen)).run();
    return null;
  }
};

exports.go = function go(f, args, returnChannel) {
  var gen = f.apply(undefined, args);
  return spawn(gen, returnChannel);
};

exports.chan = function chan(buf_or_n) {
  var buf;
  if (buf_or_n === 0) {
    buf_or_n = null;
  }
  if (typeof buf_or_n === "number") {
    buf = buffers.fixed(buf_or_n);
  } else {
    buf = buf_or_n;
  }
  return channels.chan(buf);
};

exports.buffers = {
  fixed: buffers.fixed,
  dropping: buffers.dropping,
  sliding: buffers.sliding
};

exports.put = process.put;
exports.take = process.take;
exports.wait = process.wait;
exports.alts = process.alts;
exports.stop = process.stop;
exports.put_then_callback = process.put_then_callback;
exports.take_then_callback = process.take_then_callback;

exports.timeout = timers.timeout;

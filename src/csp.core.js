const buffers = require('./impl/buffers');

exports = module.exports = require('./impl/process');

exports.chan = require('./chan');
exports.go = require('./go');
exports.spawn = require('./spawn');

// aliases
exports.putAsync = exports.put_then_callback;
exports.takeAsync = exports.take_then_callback;

// expose data from other modules
exports.CLOSED = require('./impl/channels').CLOSED;
exports.DEFAULT = require('./impl/select').DEFAULT;
exports.timeout = require('./impl/timers').timeout;

exports.buffers = {
  fixed: buffers.fixed,
  dropping: buffers.dropping,
  sliding: buffers.sliding,
};

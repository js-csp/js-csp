"use strict";

var buffers = require("./buffers");
var dispatch = require("./dispatch");

var MAX_DIRTY = 64;
var MAX_QUEUE_SIZE = 1024;

var CLOSED = null;

var Box = function(value) {
  this.value = value;
};

var PutBox = function(handler, value) {
  this.handler = handler;
  this.value = value;
};

var Channel = function(takes, puts, buf, xform) {
  this.buf = buf;
  this.xform = xform;
  this.takes = takes;
  this.puts = puts;

  this.dirty_takes = 0;
  this.dirty_puts = 0;
  this.closed = false;
};

function isReduced(v) {
  return v && v.__transducers_reduced__;
}

function schedule(f, v) {
  dispatch.run(function() {
    f(v);
  });
}

Channel.prototype._put = function(value, handler) {
  if (value === CLOSED) {
    throw new Error("Cannot put CLOSED on a channel.");
  }

  // TODO: I'm not sure how this can happen, because the operations
  // are registered in 1 tick, and the only way for this to be inactive
  // is for a previous operation in the same alt to have returned
  // immediately, which would have short-circuited to prevent this to
  // be ever register anyway. The same thing goes for the active check
  // in "_take".
  if (!handler.is_active()) {
    return null;
  }

  if (this.closed) {
    handler.commit();
    return new Box(false);
  }

  var taker, callback;

  // Soak the value through the buffer first, even if there is a
  // pending taker. This way the step function has a chance to act on the
  // value.
  if (this.buf && !this.buf.is_full()) {
    handler.commit();
    var done = isReduced(this.xform.step(this.buf, value));
    while (true) {
      if (this.buf.count() === 0) {
        break;
      }
      taker = this.takes.pop();
      if (taker === buffers.EMPTY) {
        break;
      }
      if (taker.is_active()) {
        callback = taker.commit();
        value = this.buf.remove();
        schedule(callback, value);
      }
    }
    if (done) {
      this.close();
    }
    return new Box(true);
  }

  // Either the buffer is full, in which case there won't be any
  // pending takes, or we don't have a buffer, in which case this loop
  // fulfills the first of them that is active (note that we don't
  // have to worry about transducers here since we require a buffer
  // for that).
  while (true) {
    taker = this.takes.pop();
    if (taker === buffers.EMPTY) {
      break;
    }
    if (taker.is_active()) {
      handler.commit();
      callback = taker.commit();
      schedule(callback, value);
      return new Box(true);
    }
  }

  // No buffer, full buffer, no pending takes. Queue this put now.
  if (this.dirty_puts > MAX_DIRTY) {
    this.puts.cleanup(function(putter) {
      return putter.handler.is_active();
    });
    this.dirty_puts = 0;
  } else {
    this.dirty_puts ++;
  }
  if (this.puts.length >= MAX_QUEUE_SIZE) {
    throw new Error("No more than " + MAX_QUEUE_SIZE + " pending puts are allowed on a single channel.");
  }
  this.puts.unbounded_unshift(new PutBox(handler, value));
  return null;
};

Channel.prototype._take = function(handler) {
  if (!handler.is_active()) {
    return null;
  }

  var putter, put_handler, callback, value;

  if (this.buf && this.buf.count() > 0) {
    handler.commit();
    value = this.buf.remove();
    // We need to check pending puts here, other wise they won't
    // be able to proceed until their number reaches MAX_DIRTY
    while (true) {
      if (this.buf.is_full()) {
        break;
      }
      putter = this.puts.pop();
      if (putter === buffers.EMPTY) {
        break;
      }
      put_handler = putter.handler;
      if (put_handler.is_active()) {
        callback = put_handler.commit();
        if (callback) {
          schedule(callback, true);
        }
        if (isReduced(this.xform.step(this.buf, putter.value))) {
          this.close();
        }
      }
    }
    return new Box(value);
  }

  // Either the buffer is empty, in which case there won't be any
  // pending puts, or we don't have a buffer, in which case this loop
  // fulfills the first of them that is active (note that we don't
  // have to worry about transducers here since we require a buffer
  // for that).
  while (true) {
    putter = this.puts.pop();
    if (putter === buffers.EMPTY) {
      break;
    }
    put_handler = putter.handler;
    if (put_handler.is_active()) {
      callback = put_handler.commit();
      if (callback) {
        schedule(callback, true);
      }
      return new Box(putter.value);
    }
  }

  if (this.closed) {
    handler.commit();
    return new Box(CLOSED);
  }

  // No buffer, empty buffer, no pending puts. Queue this take now.
  if (this.dirty_takes > MAX_DIRTY) {
    this.takes.cleanup(function(handler) {
      return handler.is_active();
    });
    this.dirty_takes = 0;
  } else {
    this.dirty_takes ++;
  }
  if (this.takes.length >= MAX_QUEUE_SIZE) {
    throw new Error("No more than " + MAX_QUEUE_SIZE + " pending takes are allowed on a single channel.");
  }
  this.takes.unbounded_unshift(handler);
  return null;
};

Channel.prototype.close = function() {
  if (this.closed) {
    return;
  }
  this.closed = true;

  // TODO: Duplicate code. Make a "_flush" function or something
  if (this.buf) {
    this.xform.result(this.buf);
    while (true) {
      if (this.buf.count() === 0) {
        break;
      }
      taker = this.takes.pop();
      if (taker === buffers.EMPTY) {
        break;
      }
      if (taker.is_active()) {
        callback = taker.commit();
        var value = this.buf.remove();
        schedule(callback, value);
      }
    }
  }

  while (true) {
    var taker = this.takes.pop();
    if (taker === buffers.EMPTY) {
      break;
    }
    if (taker.is_active()) {
      var callback = taker.commit();
      schedule(callback, CLOSED);
    }
  }

  while (true) {
    var putter = this.puts.pop();
    if (putter === buffers.EMPTY) {
      break;
    }
    if (putter.handler.is_active()) {
      var put_callback = putter.handler.commit();
      if (put_callback) {
        schedule(put_callback, false);
      }
    }
  }
};


Channel.prototype.is_closed = function() {
  return this.closed;
};

function defaultHandler(e) {
  console.log('error in channel transformer', e.stack);
  return CLOSED;
}

function handleEx(buf, exHandler, e) {
  var def = (exHandler || defaultHandler)(e);
  if (def !== CLOSED) {
    buf.add(def);
  }
  return buf;
}

// The base transformer object to use with transducers
function AddTransformer() {
}

AddTransformer.prototype.init = function() {
  throw new Error('init not available');
};

AddTransformer.prototype.result = function(v) {
  return v;
};

AddTransformer.prototype.step = function(buffer, input) {
  buffer.add(input);
  return buffer;
};


function handleException(exHandler) {
  return function(xform) {
    return {
      step: function(buffer, input) {
        try {
          return xform.step(buffer, input);
        } catch (e) {
          return handleEx(buffer, exHandler, e);
        }
      },

      result: function(buffer) {
        try {
          return xform.result(buffer);
        } catch (e) {
          return handleEx(buffer, exHandler, e);
        }
      }
    };
  };
}

// XXX: This is inconsistent. We should either call the reducing
// function xform, or call the transducer xform, not both
exports.chan = function(buf, xform, exHandler) {
  if (xform) {
    if (!buf) {
      throw new Error("Only buffered channels can use transducers");
    }

    xform = xform(new AddTransformer());
  } else {
    xform = new AddTransformer();
  }
  xform = handleException(exHandler)(xform);

  return new Channel(buffers.ring(32), buffers.ring(32), buf, xform);
};

exports.Box = Box;
exports.Channel = Channel;
exports.CLOSED = CLOSED;

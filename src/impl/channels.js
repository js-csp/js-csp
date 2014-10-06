"use strict";

var buffers = require("./buffers");
var dispatch = require("./dispatch");
// TODO: This feels awkward depending on this lib just for early
// termination checking
var Reduced = require("transducers.js").Reduced;

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

// uses temp_handler and temp_result to talk back to the channel
function process_one(channel, value) {
  switch (arguments.length) {
  case 1:
    break;
  case 2:
    var taker;
    do {
      taker = channel.takes.pop();
    } while (taker !== buffers.EMPTY && !taker.is_active());
    if (taker !== buffers.EMPTY) {
      channel.temp_handler.commit();
      var callback = taker.commit();
      dispatch.run(function() {
        callback(value);
      });
    } else if (channel.buf && !channel.buf.is_full()) {
      channel.temp_handler.commit();
      channel.buf.add(value);
    } else {
      channel.overflow.unbounded_unshift(value);
    }
    break;
  default:
    throw new Error("process_one must take 1 or 2 arguments");
  };
  return channel;
};

var Channel = function(takes, overflow, puts, buf, xform) {
  this.buf = buf;
  this.overflow = overflow;
  this.takes = takes;
  this.puts = puts;

  this.dirty_takes = 0;
  this.dirty_puts = 0;
  this.closed = false;

  this.process_one = xform ? xform(process_one) : process_one;
};

Channel.prototype._put = function(value, handler) {
  // FIX: This should be checked after the reducer runs (but if it
  // fails, it should fail here, not in a callback?)
  if (value === CLOSED) {
    throw new Error("Cannot put CLOSED on a channel.");
  }

  if (this.closed || !handler.is_active()) {
    return new Box(!this.closed);
  }

  // Peek first, pop only when the reducer lets the value through
  // (or when the taker is no longer "interested")
  var taker = this.takes.peek();
  while (taker !== buffers.EMPTY && !taker.is_active()) {
    this.takes.pop();
    taker = this.takes.peek();
  }
  if (taker !== buffers.EMPTY) {
    this.temp_handler = handler;
    try {
      if (this.process_one(this, value) instanceof Reduced)
        this.close();
    } finally { delete this.temp_handler; }
    return new Box(true);
  } else {
    if (this.buf && !this.buf.is_full()) {
      this.temp_handler = handler;
      try {
        if (this.process_one(this, value) instanceof Reduced)
          this.close();
      } finally { delete this.temp_handler; }
      return new Box(true);
    } else {
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
    }
  }

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
    if (this.overflow.peek() !== buffers.EMPTY) {
      this.buf.add(this.overflow.pop());
    } else {
      while (!this.buf.is_full()) {
        putter = this.puts.pop();
        if (putter === buffers.EMPTY) {
          break;
        } else {
          if (putter.handler.is_active()) {
            callback = putter.handler.commit();
            this.temp_handler = {commit: function(){}};
            try {
              if (this.process_one(this, putter.value) instanceof Reduced)
                this.close();
            } finally { delete this.temp_handler; };
            dispatch.run(function() {
              callback(true);
            });
          }
        }
      }
    } 
    return new Box(value);
  }
  if (this.overflow.peek() !== buffers.EMPTY) {
    handler.commit();
    return new Box(this.overflow.pop());
  }

  while (true) {
    putter = this.puts.pop();
    if (putter !== buffers.EMPTY) {
      put_handler = putter.handler;
      if (put_handler.is_active()) {
        callback = put_handler.commit();
        this.temp_handler = {commit: function(){}};
        try {
          if (this.process_one(this, putter.value) instanceof Reduced)
            this.close();
        } finally { delete this.temp_handler; }
        dispatch.run(function() {
          callback(true);
        });
        return this._take(handler);
      } else {
        continue;
      }
    } else {
      if (this.closed) {
        handler.commit();
        return new Box(CLOSED);
      } else {
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
      }
    }
    break;
  }

  return null;
};

Channel.prototype.close = function() {
  if (this.closed) {
    return;
  }
  this.closed = true;
  while (true) {
    var taker = this.takes.pop();
    if (taker === buffers.EMPTY) {
      break;
    }
    if (taker.is_active()) {
      var callback = taker.commit();
      dispatch.run(function() {
        callback(CLOSED);
      });
    }
  }
  // TODO: Tests
  while (true) {
    var putter = this.puts.pop();
    if (putter === buffers.EMPTY) {
      break;
    }
    if (putter.handler.is_active()) {
      var put_callback = putter.handler.commit();
      dispatch.run(function() {
        put_callback(false);
      });
    }
  }
};


Channel.prototype.is_closed = function() {
  return this.closed;
};


exports.chan = function(buf, xform) {
  return new Channel(buffers.ring(32), buffers.ring(32), buffers.ring(32), buf, xform);
};

exports.Box = Box;

exports.CLOSED = CLOSED;

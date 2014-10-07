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

function process_one(channel, value) {
  switch (arguments.length) {
  case 1:
    break;
  case 2:
    if (value === CLOSED)
      throw new Error("Cannot put CLOSED on a channel");
    var taker;
    do {
      taker = channel.takes.pop();
    } while (taker !== buffers.EMPTY && !taker.is_active());
    if (taker !== buffers.EMPTY) {
      // if we have a taker: pass our value to it
      var callback = taker.commit();
      dispatch.run(function() {
        callback(value);
      });
    } else if (channel.buf && !channel.buf.is_full()) {
      // if the buffer has room: put the value ino the buffer
      channel.buf.add(value);
    } else {
      // otherwise, store it in our overflow buffer
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
  // we only peek here because the call to process_one will pop

  var haveTaker = (taker !== buffers.EMPTY);
  var roomInBuffer = (this.buf && !this.buf.is_full());
  if (haveTaker || roomInBuffer) {
    // if we have a taker, or if we have room in the buffer,
    // then call our transducer to "add" it appropriately
    if (this.process_one(this, value) instanceof Reduced)
      this.close();
    handler.commit();
    return new Box(true);
  }

  // we don't have a taker *and* we don't have room in our buffer,
  // so add it to our put queue
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

var run_putter = function(putter) {
  if (putter.handler.is_active()) {
    // active putter: run it!
    var callback = putter.handler.commit();
    if (this.process_one(this, putter.value) instanceof Reduced)
      this.close();
    dispatch.run(function() {
      callback(true);
    });
    return true;
  } else {
    return false;
  }
};

Channel.prototype._take = function(handler) {
  if (!handler.is_active()) {
    return null;
  }

  var putter, put_handler, callback, value;

  // check actual buffer
  //  if popped: pull in from overflow buffer
  // check overflow buffer
  // check putters

  if (this.buf && this.buf.count() > 0) {
    handler.commit();
    value = this.buf.remove();
    if (this.overflow.peek() !== buffers.EMPTY) {
      this.buf.add(this.overflow.pop()); // pop from overflow to buf
    } else {
      while (!this.buf.is_full() && this.puts.peek() != buffers.EMPTY) {
        // a transducer might not return any results, so keep going until we get something
        // or until we run out of buffered puts
        run_putter.call(this, this.puts.pop());
      }
    }
    return new Box(value);
  }

  if ((value = this.overflow.pop()) !== buffers.EMPTY) {
    // if we have a value popped from overflow then use it
    handler.commit();
    return new Box(value);
  }

  while (this.puts.peek() !== buffers.EMPTY) {
    // while we still have puts to consider: try them
    // if one runs: re-enter _take now that it's written to the buffer/overflow
    if (run_putter.call(this, this.puts.pop())) {
      return this._take(handler);
    }
  }

  if (this.closed) {
    // if the channel is closed: put the CLOSED value straight in
    handler.commit();
    return new Box(CLOSED);
  } else {
    // we've failed to get any sort of a value, so add it to the takers queue
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

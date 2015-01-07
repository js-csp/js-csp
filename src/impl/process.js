"use strict";

var dispatch = require("./dispatch");
var select = require("./select");
var Channel = require("./channels").Channel;
var config = require("./config");
var CLOSED = require("./channels").CLOSED;

var FnHandler = function(f) {
  this.f = f;
};

FnHandler.prototype.is_active = function() {
  return true;
};

FnHandler.prototype.commit = function() {
  return this.f;
};

function put_then_callback(channel, value, callback) {
  var result = channel._put(value, new FnHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

function take_then_callback(channel, callback) {
  var result = channel._take(new FnHandler(callback));
  if (result) {
    callback(result.value);
  }
}

var Process = function(gen, opts, onFinish) {
  this.gen = gen;
  this.creatorFunc = opts.creator;
  this.finished = false;
  this.propagates = opts.propagate;
  this.onFinish = onFinish;
};

var Instruction = function(op, data) {
  this.op = op;
  this.data = data;
};

var TAKE = "take";
var PUT = "put";
var SLEEP = "sleep";
var ALTS = "alts";

var Throw = function(e) {
  if(!(this instanceof Throw)) {
    return new Throw(e);
  }
  if(typeof e === 'string') {
    e = new Error(e);
  }
  this.error = e;
  this.stacks = [];
}

var _defaultHandler;
function setDefaultExceptionHandler(handler) {
  _defaultHandler = handler;
}

function getDefaultExceptionHandler() {
  return _defaultHandler;
}

// TODO FIX XXX: This is a (probably) temporary hack to avoid blowing
// up the stack, but it means double queueing when the value is not
// immediately available
Process.prototype._continue = function(response, frameErrorObj) {
  var self = this;
  dispatch.run(function() {
    if(response instanceof Throw) {
      self._error(response, frameErrorObj);
    }
    else {
      self.run(response);
    }
  });
};

Process.prototype._done = function(value) {
  if (!this.finished) {
    this.finished = true;
    var onFinish = this.onFinish;
    if (typeof onFinish === "function") {
      onFinish = onFinish.bind(this);
      dispatch.run(function() {
        onFinish(value);
      });
    }
  }
};

Process.prototype._error = function(response, frameErrorObj) {
  var handler = getDefaultExceptionHandler();
  if(this.propagates || handler) {
    try {
      // The process might catch the exception
      var res = this.gen.throw(response.error);
      res.done ? this._done(res) : this._continue(res);
    }
    catch(e) {
      if(e !== response.error) {
        throw e;
      }

      if(this.propagates) {
        if(config.stackHistory) {
          response.stacks.push(frameErrorObj);
        }
        this._done(response);
      }
      else {
        handler(response);
      }
    }
  }
  else {
    var res = this.gen.throw(response.error);
    res.done ? this._done(res) : this._continue(res);
  }
}

Process.prototype.run = function(response) {
  if (this.finished) {
    return;
  }

  // TODO: Shouldn't we (optionally) stop error propagation here (and
  // signal the error through a channel or something)? Otherwise the
  // uncaught exception will crash some runtimes (e.g. Node)
  var iter = this.gen.next(response);
  if (iter.done) {
    this._done(iter.value);
    return;
  }

  var ins = iter.value;
  var self = this;

  if (ins instanceof Instruction) {
    switch (ins.op) {
    case PUT:
      var data = ins.data;
      put_then_callback(data.channel, data.value, function(ok) {
        self._continue(ok);
      });
      break;

    case TAKE:
      var data = ins.data;
      take_then_callback(data.channel, function(value) {
        self._continue(value, data.frameErrorObj);
      });
      break;

    case SLEEP:
      var msecs = ins.data;
      dispatch.queue_delay(function() {
        self.run(null);
      }, msecs);
      break;

    case ALTS:
      select.do_alts(ins.data.operations, function(result) {
        self._continue(result);
      }, ins.data.options);
      break;
    }
  }
  else if(ins instanceof Channel) {
    var channel = ins;
    take_then_callback(channel, function(value) {
      self._continue(value);
    });
  }
  else {
    this._continue(ins);
  }
};

function take(channel) {
  var frameErrorObj;
  if(config.stackHistory) {
    frameErrorObj = new Error();
  }

  return new Instruction(TAKE, {
    channel: channel,
    frameErrorObj: frameErrorObj
  });
}

function put(channel, value) {
  return new Instruction(PUT, {
    channel: channel,
    value: value
  });
}

function sleep(msecs) {
  return new Instruction(SLEEP, msecs);
}

function alts(operations, options) {
  return new Instruction(ALTS, {
    operations: operations,
    options: options
  });
}

exports.put_then_callback = put_then_callback;
exports.take_then_callback = take_then_callback;
exports.put = put;
exports.take = take;
exports.sleep = sleep;
exports.alts = alts;

exports.Process = Process;
exports.Throw = Throw;
exports.setDefaultExceptionHandler = setDefaultExceptionHandler;

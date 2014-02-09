var Box = require("./channels").Box;

var AltHandler = function(flag, f) {
  this.f = f;
  this.flag = flag;
};

AltHandler.prototype.is_active = function() {
  return this.flag.value;
};

AltHandler.prototype.commit = function() {
  this.flag.value = false;
  return this.f;
};

var AltResult = function(value, channel) {
  this.value = value;
  this.channel = channel;
};

function rand_int(n) {
  return Math.floor(Math.random() * (n + 1));
}

function random_array(n) {
  var a = new Array(n);
  for (var i = 0; i < n; i++) {
    a[i] = 0;
  }
  i = 1;
  while (true) {
    if (i >= n) {
      return a;
    }
    var j = rand_int(i);
    a[i] = a[j];
    a[j] = i;
    i ++;
  }
}

// TODO: Accept a priority function or something
exports.do_alts = function(operations, callback) {
  var length = operations.length;
  // XXX Hmm
  if (length === 0) {
    throw new Error("Empty alt list");
  }

  var indexes = random_array(length);
  var flag = new Box(true);

  for (var i = 0; i < length; i++) {
    var operation = operations[i];
    var port, result;
    // XXX Hmm
    if (operation instanceof Array) {
      var value = operation[1];
      port = operation[0];
      result = port._put(value, (function(port) {
        return new AltHandler(flag, function(ok) {
          callback(new AltResult(ok, port));
        });
      })(port));
    } else {
      port = operation;
      result = port._take((function(port) {
        return new AltHandler(flag, function(value) {
          callback(new AltResult(value, port));
        });
      })(port));
    }
    // XXX Hmm
    if (result instanceof Box) {
      callback(new AltResult(result.value, port));
    }
  }
};

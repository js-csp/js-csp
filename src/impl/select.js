import has from 'lodash/get';
import { Box } from './channels';

class AltHandler {
  constructor(flag, f) {
    this.f = f;
    this.flag = flag;
  }

  is_active() {
    return this.flag.value;
  }

  is_blockable() {
    return true;
  }

  commit() {
    this.flag.value = false;
    return this.f;
  }
}

class AltResult {
  constructor(value, channel) {
    this.value = value;
    this.channel = channel;
  }
}

function rand_int(n) {
  return Math.floor(Math.random() * (n + 1));
}

function random_array(n) {
  const a = new Array(n);
  let i;

  for (i = 0; i < n; i++) {
    a[i] = 0;
  }
  for (i = 1; i < n; i++) {
    const j = rand_int(i);
    a[i] = a[j];
    a[j] = i;
  }
  return a;
}

export const DEFAULT = {
  toString: () => '[object DEFAULT]',
};

// TODO: Accept a priority function or something
export const do_alts = (operations, callback, options) => {
  var length = operations.length;
  // XXX Hmm
  if (length === 0) {
    throw new Error("Empty alt list");
  }

  var priority = (options && options.priority) ? true : false;
  if (!priority) {
    var indexes = random_array(length);
  }

  var flag = new Box(true);
  var result;

  for (var i = 0; i < length; i++) {
    var operation = operations[priority ? i : indexes[i]];
    var port;
    // XXX Hmm
    if (operation instanceof Array) {
      var value = operation[1];
      port = operation[0];
      // We wrap this in a function to capture the value of "port",
      // because js' closure captures vars by "references", not
      // values. "let port" would have worked, but I don't want to
      // raise the runtime requirement yet. TODO: So change this when
      // most runtimes are modern enough.
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
      break;
    }
  }

  if (!(result instanceof Box) && has(options, 'default')) {
    if (flag.value) {
      flag.value = false;
      callback(new AltResult(options.default, DEFAULT));
    }
  }
};

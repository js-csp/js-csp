// @flow
import has from 'lodash/get';
import range from 'lodash/range';
import shuffle from 'lodash/shuffle';
import { Box } from './channels';

class AltHandler {
  flag: Box;
  f: Function;

  constructor(flag, f) {
    this.f = f;
    this.flag = flag;
  }

  isActive() {
    return this.flag.value;
  }

  isBlockable() {
    return true;
  }

  commit() {
    this.flag.value = false;
    return this.f;
  }
}

class AltResult {
  // TODO: Fix this
  value: Object;
  channel: Object;

  constructor(value, channel) {
    this.value = value;
    this.channel = channel;
  }
}

export const DEFAULT = {
  toString: () => '[object DEFAULT]',
};

// TODO: Accept a priority function or something
export const doAlts = (operations: Object[], callback: Function, options: Object) => {
  if (operations.length === 0) throw new Error('Empty alt list');

  const flag = new Box(true);
  const indexes = shuffle(range(operations.length));
  const hasPriority = options && options.priority;
  let result;

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[hasPriority ? i : indexes[i]];
    let port;

    // XXX Hmm
    if (operation instanceof Array) {
      const value = operation[1];
      port = operation[0];

      result = port._put(
        value,
        new AltHandler(flag, (ok) => callback(new AltResult(ok, port)))
      );
    } else {
      port = operation;

      result = port._take(
        new AltHandler(flag, (value) => callback(new AltResult(value, port)))
      );
    }

    // XXX Hmm
    if (result instanceof Box) {
      callback(new AltResult(result.value, port));
      break;
    }
  }

  if (!(result instanceof Box) && has(options, 'default') && flag.value) {
    flag.value = false;
    callback(new AltResult(options.default, DEFAULT));
  }
};

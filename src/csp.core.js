import * as buffers from './impl/buffers';
import * as channels from './impl/channels';
import * as process from './impl/process';
import * as select from './impl/select';
import * as timers from './impl/timers';

const spawn = (gen, creator) => {
  const ch = channels.chan(buffers.fixed(1));

  (new process.Process(gen, (value) => {
    if (value === channels.CLOSED) {
      ch.close();
    } else {
      process.putThenCallback(ch, value, () => ch.close());
    }
  }, creator)).run();

  return ch;
};

const go = (f, args = []) => spawn(f(...args), f);

const chan = (bufferOrNumber, xform, exHandler) => {
  let buf;
  if (bufferOrNumber === 0) {
    bufferOrNumber = null;
  }
  if (typeof bufferOrNumber === 'number') {
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
    sliding: buffers.sliding,
  },

  spawn,
  go,
  chan,
  DEFAULT: select.DEFAULT,
  CLOSED: channels.CLOSED,

  put: process.put,
  take: process.take,
  offer: process.offer,
  poll: process.poll,
  sleep: process.sleep,
  alts: process.alts,
  putAsync: process.putThenCallback,
  takeAsync: process.takeThenCallback,
  NO_VALUE: process.NO_VALUE,

  timeout: timers.timeout,
};

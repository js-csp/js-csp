// @flow
import type { BufferType } from './impl/buffers';
import { fixed, dropping, sliding } from './impl/buffers';
import { putThenCallback, Process } from './impl/process';
import { chan as channel, Channel, CLOSED } from './impl/channels';

export function spawn<Yield, Return, Next>(gen: Generator<Yield, Return, Next>, creator: Function): Channel {
  const ch = channel(fixed(1));
  const process = new Process(gen, (value) => {
    if (value === CLOSED) {
      ch.close();
    } else {
      putThenCallback(ch, value, () => ch.close());
    }
  }, creator);

  process.run();
  return ch;
}

export function go(f: Function, args: any[] = []): Channel {
  return spawn(f(...args), f);
}

export function chan<T>(bufferOrNumber: ?BufferType<T> | ?number, xform: ?Function, exHandler: ?Function): Channel {
  if (typeof bufferOrNumber === 'number') {
    return channel(bufferOrNumber === 0 ? null : fixed(bufferOrNumber), xform, exHandler);
  }

  return channel(bufferOrNumber, xform, exHandler);
}

// TODO: Fix those import statements
export const buffers = { fixed, dropping, sliding };
export { CLOSED };
export { timeout } from './impl/timers';
export { DEFAULT } from './impl/results';
export {
  put, take, offer, poll, sleep, alts,
  putThenCallback as putAsync, takeThenCallback as takeAsync, NO_VALUE,
} from './impl/process';

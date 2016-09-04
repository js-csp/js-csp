// @flow
import { fixed, dropping, sliding } from './impl/buffers';
import { putThenCallback, Process } from './impl/process';
import type { ChannelBufferType } from './impl/channels';
import { chan as channel, CLOSED } from './impl/channels';

export function spawn(gen: Generator<any, any, any>, creator: Function) {
  const ch = channel(fixed(1));

  (new Process(gen, (value) => {
    if (value === CLOSED) {
      ch.close();
    } else {
      putThenCallback(ch, value, () => ch.close());
    }
  }, creator)).run();

  return ch;
}

export function go(f: Function, args: any[] = []) {
  return spawn(f(...args), f);
}

export function chan(
  bufferOrNumber: ChannelBufferType | number,
  xform: ?Function,
  exHandler: ?Function
) {
  if (typeof bufferOrNumber === 'number') {
    if (bufferOrNumber === 0) {
      return channel(undefined, xform, exHandler);
    }

    return channel(fixed(bufferOrNumber), xform, exHandler);
  }

  return channel(bufferOrNumber, xform, exHandler);
}

export const buffers = { fixed, dropping, sliding };
export { CLOSED };
export { timeout } from './impl/timers';
export { DEFAULT } from './impl/results';
export {
  put, take, offer, poll, sleep, alts,
  putThenCallback as putAsync, takeThenCallback as takeAsync, NO_VALUE,
} from './impl/process';

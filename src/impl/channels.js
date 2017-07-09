// @flow
import constant from 'lodash/constant';
import { MAX_QUEUE_SIZE } from './protocols';
import { RingBuffer, ring } from './buffers';
import { Box, PutBox } from './boxes';
import { run } from './dispatch';
import type {
  MMCInterface,
  ReadPortInterface,
  WritePortInterface,
  HandlerInterface,
  ChannelInterface,
  BufferInterface,
} from './protocols';

export const MAX_DIRTY = 64;
export const CLOSED = null;

const box = (val: any) => new Box(val);
const isReduced = (v: Object) => v && v['@@transducer/reduced'];

export class Channel
  implements MMCInterface, WritePortInterface, ReadPortInterface, ChannelInterface {
  buf: ?BufferInterface<any>;
  xform: Object;
  takes: RingBuffer<HandlerInterface>;
  puts: RingBuffer<PutBox>;
  dirtyPuts: number;
  dirtyTakes: number;
  closed: boolean;

  constructor(
    takes: RingBuffer<HandlerInterface>,
    puts: RingBuffer<PutBox>,
    buf: ?BufferInterface<any>,
    xform: Object
  ) {
    this.buf = buf;
    this.xform = xform;
    this.takes = takes;
    this.puts = puts;
    this.dirtyTakes = 0;
    this.dirtyPuts = 0;
    this.closed = false;
  }

  abort() {
    while (true) {
      const putter: ?PutBox = this.puts.pop();

      if (!putter) {
        break;
      }

      if (putter.handler.isActive()) {
        const putCb = putter.handler.commit();
        run(() => putCb(true));
      }
    }

    this.puts.cleanup(constant(false));
    this.close();
  }

  put(value: any, handler: HandlerInterface): ?Box {
    if (value === CLOSED) {
      throw new Error("Can't put CLOSED in a channel.");
    }

    // TODO: I'm not sure how this can happen, because the operations
    // are registered in 1 tick, and the only way for this to be inactive
    // is for a previous operation in the same alt to have returned
    // immediately, which would have short-circuited to prevent this to
    // be ever register anyway. The same thing goes for the active check
    // in "take".
    if (!handler.isActive()) {
      return null;
    }

    if (this.closed) {
      handler.commit();
      return box(false);
    }

    // Soak the value through the buffer first, even if there is a
    // pending taker. This way the step function has a chance to act on the
    // value.
    if (this.buf && !this.buf.isFull()) {
      handler.commit();
      const isDone = isReduced(
        this.xform['@@transducer/step'](this.buf, value)
      );

      // flow-ignore
      while (this.buf.count() > 0 && this.takes.length > 0) {
        const taker = this.takes.pop();

        if (taker && taker.isActive()) {
          const fn = taker.commit();
          // flow-ignore
          const val = this.buf.remove();

          run(() => fn(val));
        }
      }

      if (isDone) {
        this.abort();
      }

      return box(true);
    }

    // Either the buffer is full, in which case there won't be any
    // pending takes, or we don't have a buffer, in which case this loop
    // fulfills the first of them that is active (note that we don't
    // have to worry about transducers here since we require a buffer
    // for that).
    while (this.takes.length > 0) {
      const taker = this.takes.pop();

      // flow-ignore
      if (taker.isActive()) {
        handler.commit();
        // flow-ignore
        const fn = taker.commit();
        run(() => fn(value));
        return box(true);
      }
    }

    // No buffer, full buffer, no pending takes. Queue this put now if blockable.
    if (this.dirtyPuts > MAX_DIRTY) {
      this.puts.cleanup(putter => putter.handler.isActive());
      this.dirtyPuts = 0;
    } else {
      this.dirtyPuts += 1;
    }

    if (handler.isBlockable()) {
      if (this.puts.length >= MAX_QUEUE_SIZE) {
        throw new Error(
          `No more than ${MAX_QUEUE_SIZE} pending puts are allowed on a single channel. Consider using a windowed buffer.`
        );
      }
      this.puts.unboundedUnshift(new PutBox(handler, value));
    }

    return null;
  }

  take(handler: HandlerInterface): ?Box {
    if (!handler.isActive()) {
      return null;
    }

    if (this.buf && this.buf.count() > 0) {
      const takeCb = handler.commit();

      if (takeCb) {
        // flow-ignore
        const val = this.buf.remove();
        let isDone;
        let cbs = [];

        // flow-ignore
        while (this.puts.length > 0 && !this.buf.isFull()) {
          const putter = this.puts.pop();

          if (putter) {
            const putHandler = putter.handler;
            const val = putter.value;

            if (putHandler.isActive()) {
              cbs.push(putHandler.commit());
              isDone = isReduced(
                this.xform['@@transducer/step'](this.buf, val)
              );

              if (isDone) {
                break;
              }
            }
          }
        }

        if (isDone) {
          this.abort();
        }

        cbs.forEach(cb => run(() => cb(true)));

        return box(val);
      }
    }

    // Either the buffer is empty, in which case there won't be any
    // pending puts, or we don't have a buffer, in which case this loop
    // fulfills the first of them that is active (note that we don't
    // have to worry about transducers here since we require a buffer
    // for that).
    while (true) {
      const putter = this.puts.pop();

      if (!putter) {
        break;
      }

      if (putter.handler.isActive()) {
        const putCb = putter.handler.commit();

        handler.commit();
        run(() => putCb(true));

        return box(putter.value);
      }
    }

    if (this.closed) {
      if (handler.isActive() && handler.commit()) {
        return box(this.buf && this.buf.count() > 0 ? this.buf.remove() : null);
      } else {
        return null;
      }
    }

    // No buffer, empty buffer, no pending puts. Queue this take now if blockable.
    if (this.dirtyTakes > MAX_DIRTY) {
      this.takes.cleanup(handler => handler.isActive());
      this.dirtyTakes = 0;
    } else {
      this.dirtyTakes += 1;
    }

    if (handler.isBlockable()) {
      if (this.takes.length >= MAX_QUEUE_SIZE) {
        throw new Error(
          `No more than ${MAX_QUEUE_SIZE} pending takes are allowed on a single channel.`
        );
      }

      this.takes.unboundedUnshift(handler);
    }

    return null;
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.buf && this.puts.length === 0) {
      this.xform['@@transducer/result'](this.buf);
    }

    while (true) {
      const taker = this.takes.pop();

      if (!taker) {
        break;
      }

      if (taker.isActive()) {
        const takeCb = taker.commit();
        const val = this.buf && this.buf.count() > 0 ? this.buf.remove() : null;

        run(() => takeCb(val));
      }
    }

    if (this.buf) {
      this.buf.closeBuffer();
    }
  }

  isClosed() {
    return this.closed;
  }
}

// The base transformer object to use with transducers
const AddTransformer: Object = {
  '@@transducer/init': () => {
    throw new Error('init not available');
  },

  '@@transducer/result': v => v,

  '@@transducer/step': (buffer, input) => {
    buffer.add(input);
    return buffer;
  },
};

function defaultExceptionHandler(err: Error): typeof CLOSED {
  console.log('error in channel transformer', err.stack); // eslint-disable-line
  return CLOSED;
}

function handleEx<T>(
  buf: BufferInterface<T>,
  exHandler: ?Function,
  e: Error
): BufferInterface<T> {
  const def = (exHandler || defaultExceptionHandler)(e);

  if (def !== CLOSED) {
    buf.add(def);
  }

  return buf;
}

function handleException<T>(exHandler: ?Function): Function {
  return (xform: Object): Object => ({
    '@@transducer/step': (buffer: BufferInterface<T>, input: any) => {
      try {
        return xform['@@transducer/step'](buffer, input);
      } catch (e) {
        return handleEx(buffer, exHandler, e);
      }
    },
    '@@transducer/result': (buffer: BufferInterface<T>) => {
      try {
        return xform['@@transducer/result'](buffer);
      } catch (e) {
        return handleEx(buffer, exHandler, e);
      }
    },
  });
}

// XXX: This is inconsistent. We should either call the reducing
// function xform, or call the transducers xform, not both
export function chan(
  buf: ?BufferInterface<any>,
  xform: ?Function,
  exHandler: ?Function
): Channel {
  let newXForm: typeof AddTransformer;

  if (xform) {
    if (!buf) {
      throw new Error('Only buffered channels can use transducers');
    }

    newXForm = xform(AddTransformer);
  } else {
    newXForm = AddTransformer;
  }

  return new Channel(
    ring(32),
    ring(32),
    buf,
    handleException(exHandler)(newXForm)
  );
}

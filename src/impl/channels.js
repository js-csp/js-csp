// @flow
import { run } from './dispatch';
import type { BufferType } from './buffers';
import { RingBuffer, ring } from './buffers';
import type { HandlerType } from './handlers';

export const MAX_DIRTY = 64;
export const MAX_QUEUE_SIZE = 1024;
export const CLOSED = null;

const isReduced = (v) => v && v['@@transducer/reduced'];
const schedule = (f, v) => run(() => f(v));

export class Box<T> {
  value: T;

  constructor(value: T) {
    this.value = value;
  }
}

export class PutBox<T> {
  handler: HandlerType;
  value: T;

  constructor(handler: HandlerType, value: any) {
    this.handler = handler;
    this.value = value;
  }
}

export class Channel<T> {
  buf: ?BufferType<T>;
  xform: Object;
  takes: RingBuffer<HandlerType>;
  puts: RingBuffer<PutBox<any>>;
  dirtyPuts: number;
  dirtyTakes: number;
  closed: boolean;

  constructor(takes: RingBuffer<any>, puts: RingBuffer<PutBox<any>>, buf: ?BufferType<T>, xform: Object) {
    this.buf = buf;
    this.xform = xform;
    this.takes = takes;
    this.puts = puts;
    this.dirtyTakes = 0;
    this.dirtyPuts = 0;
    this.closed = false;
  }

  put(value: any, handler: HandlerType): ?Box<any> {
    if (value === CLOSED) {
      throw new Error('Cannot put CLOSED on a channel.');
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
      return new Box(false);
    }

    // Soak the value through the buffer first, even if there is a
    // pending taker. This way the step function has a chance to act on the
    // value.
    if (this.buf && !this.buf.isFull()) {
      handler.commit();
      const done = isReduced(this.xform['@@transducer/step'](this.buf, value));

      // flow-ignore
      while (this.takes.count() > 0 && this.buf.count() > 0) {
        const taker: HandlerType = this.takes.pop();

        if (taker.isActive()) {
          // flow-ignore
          schedule(taker.commit(), this.buf.remove());
        }
      }
      if (done) {
        this.close();
      }
      return new Box(true);
    }

    // Either the buffer is full, in which case there won't be any
    // pending takes, or we don't have a buffer, in which case this loop
    // fulfills the first of them that is active (note that we don't
    // have to worry about transducers here since we require a buffer
    // for that).
    while (this.takes.count() > 0) {
      const taker: HandlerType = this.takes.pop();

      if (taker.isActive()) {
        handler.commit();
        const callback = taker.commit();
        schedule(callback, value);
        return new Box(true);
      }
    }

    // No buffer, full buffer, no pending takes. Queue this put now if blockable.
    if (this.dirtyPuts > MAX_DIRTY) {
      this.puts.cleanup((putter) => putter.handler.isActive());
      this.dirtyPuts = 0;
    } else {
      this.dirtyPuts++;
    }

    if (handler.isBlockable()) {
      if (this.puts.count() >= MAX_QUEUE_SIZE) {
        throw new Error(`No more than ${MAX_QUEUE_SIZE} pending puts are allowed on a single channel.`);
      }
      this.puts.unshift(new PutBox(handler, value));
    }

    return null;
  }

  take(handler: HandlerType): ?Box<any> {
    if (!handler.isActive()) {
      return null;
    }

    if (this.buf && this.buf.count() > 0) {
      handler.commit();
      // flow-ignore
      const value: any = this.buf.remove();

      // We need to check pending puts here, other wise they won't
      // be able to proceed until their number reaches MAX_DIRTY

      // flow-ignore
      while (this.puts.count() > 0 && !this.buf.isFull()) {
        // flow-ignore
        const putter: PutBox<any> = this.puts.pop();

        if (putter.handler.isActive()) {
          const callback: ?Function = putter.handler.commit();

          if (callback) {
            schedule(callback, true);
          }

          if (isReduced(this.xform['@@transducer/step'](this.buf, putter.value))) {
            this.close();
          }
        }
      }
      return new Box(value);
    }

    // Either the buffer is empty, in which case there won't be any
    // pending puts, or we don't have a buffer, in which case this loop
    // fulfills the first of them that is active (note that we don't
    // have to worry about transducers here since we require a buffer
    // for that).
    while (this.puts.count() > 0) {
      // flow-ignore
      const putter: PutBox<any> = this.puts.pop();

      if (putter.handler.isActive()) {
        handler.commit();
        const callback: ?Function = putter.handler.commit();

        if (callback) {
          schedule(callback, true);
        }

        return new Box(putter.value);
      }
    }

    if (this.closed) {
      handler.commit();
      return new Box(CLOSED);
    }

    // No buffer, empty buffer, no pending puts. Queue this take now if blockable.
    if (this.dirtyTakes > MAX_DIRTY) {
      this.takes.cleanup((_handler: HandlerType) => _handler.isActive());
      this.dirtyTakes = 0;
    } else {
      this.dirtyTakes++;
    }

    if (handler.isBlockable()) {
      if (this.takes.count() >= MAX_QUEUE_SIZE) {
        throw new Error(`No more than ${MAX_QUEUE_SIZE} pending takes are allowed on a single channel.`);
      }

      this.takes.unshift(handler);
    }

    return null;
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // TODO: Duplicate code. Make a "_flush" function or something
    if (this.buf) {
      this.xform['@@transducer/result'](this.buf);

      // flow-ignore
      while (this.takes.count() > 0 && this.buf.count() > 0) {
        const taker: HandlerType = this.takes.pop();

        if (taker.isActive()) {
          // flow-ignore
          schedule(taker.commit(), this.buf.remove());
        }
      }
    }

    while (this.takes.count() > 0) {
      const taker: HandlerType = this.takes.pop();

      if (taker.isActive()) {
        schedule(taker.commit(), CLOSED);
      }
    }

    while (this.puts.count() > 0) {
      // flow-ignore
      const putter: PutBox<any> = this.puts.pop();

      if (putter.handler.isActive()) {
        const pulCallback: ?Function = putter.handler.commit();

        if (pulCallback) {
          schedule(pulCallback, false);
        }
      }
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

  '@@transducer/result': (v) => v,

  '@@transducer/step': (buffer, input) => {
    buffer.add(input);
    return buffer;
  },
};

function handleEx<T>(buf: BufferType<T>, exHandler: ?Function, e: Error) {
  const def = (exHandler || ((err: Error) => {
    console.log('error in channel transformer', err.stack); // eslint-disable-line
    return CLOSED;
  }))(e);

  if (def !== CLOSED) {
    buf.add(def);
  }

  return buf;
};

const handleException = (exHandler: ?Function): Function => (xform: Object): Object => ({
  '@@transducer/step': (buffer: BufferType, input: any) => {
    try {
      return xform['@@transducer/step'](buffer, input);
    } catch (e) {
      return handleEx(buffer, exHandler, e);
    }
  },
  '@@transducer/result': (buffer: BufferType) => {
    try {
      return xform['@@transducer/result'](buffer);
    } catch (e) {
      return handleEx(buffer, exHandler, e);
    }
  },
});

// XXX: This is inconsistent. We should either call the reducing
// function xform, or call the transducer xform, not both
export function chan<T>(buf: ?BufferType<T>, xform: ?Function, exHandler: ?Function): Channel {
  let newXForm: typeof AddTransformer;

  if (xform) {
    if (!buf) {
      throw new Error('Only buffered channels can use transducers');
    }

    newXForm = xform(AddTransformer);
  } else {
    newXForm = AddTransformer;
  }

  return new Channel(ring(), ring(), buf, handleException(exHandler)(newXForm));
}

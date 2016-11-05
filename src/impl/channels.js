// @flow
import type { BufferType } from './buffers';
import { RingBuffer, ring } from './buffers';
import { Box, PutBox } from './boxes';
import { isReduced, flush, taskScheduler } from './utils';
import type { HandlerType } from './handlers';

export const MAX_DIRTY = 64;
export const MAX_QUEUE_SIZE = 1024;
export const CLOSED = null;

export class Channel {
  buf: ?BufferType<mixed>;
  xform: Object;
  takes: RingBuffer<HandlerType>;
  puts: RingBuffer<PutBox<mixed>>;
  dirtyPuts: number;
  dirtyTakes: number;
  closed: boolean;

  constructor(takes: RingBuffer<HandlerType>, puts: RingBuffer<PutBox<mixed>>, buf: ?BufferType<mixed>, xform: Object) {
    this.buf = buf;
    this.xform = xform;
    this.takes = takes;
    this.puts = puts;
    this.dirtyTakes = 0;
    this.dirtyPuts = 0;
    this.closed = false;
  }

  put(value: mixed, handler: HandlerType): ?Box<mixed> {
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
      while (this.buf.count() > 0 && this.takes.length > 0) {
        const taker = this.takes.pop();

        // flow-ignore
        if (taker.isActive()) {
          // flow-ignore
          taskScheduler(taker.commit(), this.buf.remove());
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
    while (this.takes.length > 0) {
      const taker = this.takes.pop();

      // flow-ignore
      if (taker.isActive()) {
        handler.commit();
        // flow-ignore
        taskScheduler(taker.commit(), value);
        return new Box(true);
      }
    }

    // No buffer, full buffer, no pending takes. Queue this put now if blockable.
    if (this.dirtyPuts > MAX_DIRTY) {
      this.puts.cleanup((putter) => putter.handler.isActive());
      this.dirtyPuts = 0;
    } else {
      this.dirtyPuts += 1;
    }

    if (handler.isBlockable()) {
      if (this.puts.length >= MAX_QUEUE_SIZE) {
        throw new Error(`No more than ${MAX_QUEUE_SIZE} pending puts are allowed on a single channel.`);
      }
      this.puts.unboundedUnshift(new PutBox(handler, value));
    }

    return null;
  }

  take(handler: HandlerType): ?Box<mixed> {
    if (!handler.isActive()) {
      return null;
    }

    if (this.buf && this.buf.count() > 0) {
      handler.commit();
      // flow-ignore
      const value: mixed = this.buf.remove();

      // We need to check pending puts here, other wise they won't
      // be able to proceed until their number reaches MAX_DIRTY

      // flow-ignore
      while (this.puts.length > 0 && !this.buf.isFull()) {
        const putter = this.puts.pop();

        // flow-ignore
        if (putter.handler.isActive()) {
          // flow-ignore
          taskScheduler(putter.handler.commit(), true);

          // flow-ignore
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
    while (this.puts.length > 0) {
      const putter = this.puts.pop();

      // flow-ignore
      if (putter.handler.isActive()) {
        handler.commit();
        // flow-ignore
        taskScheduler(putter.handler.commit(), true);

        // flow-ignore
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
      this.dirtyTakes += 1;
    }

    if (handler.isBlockable()) {
      if (this.takes.length >= MAX_QUEUE_SIZE) {
        throw new Error(`No more than ${MAX_QUEUE_SIZE} pending takes are allowed on a single channel.`);
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

    if (this.buf) {
      this.xform['@@transducer/result'](this.buf);

      // flow-ignore
      while (this.buf.count() > 0 && this.takes.length > 0) {
        const taker = this.takes.pop();

        // flow-ignore
        if (taker.isActive()) {
          // flow-ignore
          taskScheduler(taker.commit(), this.buf.remove());
        }
      }
    }

    flush(this.takes, (taker: HandlerType) => {
      if (taker.isActive()) {
        taskScheduler(taker.commit(), CLOSED);
      }
    });

    flush(this.puts, (putter: PutBox<mixed>) => {
      if (putter.handler.isActive()) {
        taskScheduler(putter.handler.commit(), false);
      }
    });
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

function handleEx<T>(buf: BufferType<T>,
                     exHandler: ?Function,
                     e: Error): BufferType<T> {
  const def = (exHandler || defaultExceptionHandler)(e);

  if (def !== CLOSED) {
    buf.add(def);
  }

  return buf;
}

function handleException<T>(exHandler: ?Function): Function {
  return (xform: Object): Object => ({
    '@@transducer/step': (buffer: BufferType<T>, input: mixed) => {
      try {
        return xform['@@transducer/step'](buffer, input);
      } catch (e) {
        return handleEx(buffer, exHandler, e);
      }
    },
    '@@transducer/result': (buffer: BufferType<T>) => {
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
export function chan(buf: ?BufferType<mixed>,
                     xform: ?Function,
                     exHandler: ?Function): Channel {
  let newXForm: typeof AddTransformer;

  if (xform) {
    if (!buf) {
      throw new Error('Only buffered channels can use transducers');
    }

    newXForm = xform(AddTransformer);
  } else {
    newXForm = AddTransformer;
  }

  return new Channel(ring(32), ring(32), buf, handleException(exHandler)(newXForm));
}

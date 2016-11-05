// @flow
import { doAlts } from './select';
import { FnHandler } from './handlers';
import { TakeInstruction, PutInstruction, SleepInstruction, AltsInstruction } from './instruction';
import { Box } from './boxes';
import { Channel } from './channels';
import { queueDelay } from './dispatch';

export const NO_VALUE = '@@process/NO_VALUE';

export function putThenCallback(channel: Channel, value: mixed, callback: ?Function): void {
  const result: ?Box<mixed> = channel.put(value, new FnHandler(true, callback));

  if (result && callback) {
    callback(result.value);
  }
}

export function takeThenCallback(channel: Channel, callback: ?Function): void {
  const result: ?Box<mixed> = channel.take(new FnHandler(true, callback));

  if (result && callback) {
    callback(result.value);
  }
}

export function take(channel: Channel): TakeInstruction {
  return new TakeInstruction(channel);
}

export function put(channel: Channel, value: Object): PutInstruction {
  return new PutInstruction(channel, value);
}

export function sleep(msecs: number): SleepInstruction {
  return new SleepInstruction(msecs);
}

export function alts(operations: Channel[] | [Channel, mixed][], options: Object): AltsInstruction {
  return new AltsInstruction(operations, options);
}

export function poll(channel: Channel): mixed | typeof NO_VALUE {
  if (channel.closed) {
    return NO_VALUE;
  }

  const result: ?Box<mixed> = channel.take(new FnHandler(false));

  return result ? result.value : NO_VALUE;
}

export function offer(channel: Channel, value: Object): boolean {
  if (channel.closed) {
    return false;
  }

  const result: ?Box<mixed> = channel.put(value, new FnHandler(false));

  return result instanceof Box;
}

export class Process {
  gen: Generator<mixed, void, mixed>;
  onFinishFunc: Function;
  creatorFunc: Function;
  finished: boolean;

  constructor(gen: Generator<mixed, void, mixed>, onFinishFunc: Function, creatorFunc: Function) {
    this.gen = gen;
    this.finished = false;
    this.creatorFunc = creatorFunc;
    this.onFinishFunc = onFinishFunc;
  }

  schedule = (nextState: mixed): void => {
    setImmediate(() => this.run(nextState));
  };

  run(state: mixed): void {
    if (!this.finished) {
      // TODO: Shouldn't we (optionally) stop error propagation here (and
      // signal the error through a channel or something)? Otherwise the
      // uncaught exception will crash some runtimes (e.g. Node)
      const { done, value } = this.gen.next(state);

      if (done) {
        this.finished = true;
        this.onFinishFunc(value);
      } else if (value instanceof TakeInstruction) {
        takeThenCallback(value.channel, this.schedule);
      } else if (value instanceof PutInstruction) {
        putThenCallback(value.channel, value.value, this.schedule);
      } else if (value instanceof SleepInstruction) {
        queueDelay(this.schedule, value.msec);
      } else if (value instanceof AltsInstruction) {
        doAlts(value.operations, this.schedule, value.options);
      } else if (value instanceof Channel) {
        takeThenCallback(value, this.schedule);
      } else {
        this.schedule(value);
      }
    }
  }
}

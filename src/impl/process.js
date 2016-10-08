// @flow
import { doAlts } from './select';
import { FnHandler } from './handlers';
import { TakeInstruction, PutInstruction, SleepInstruction, AltsInstruction } from './instruction';
import { Box } from './boxes';
import { Channel } from './channels';
import { run, queueDelay } from './dispatch';

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
    this.creatorFunc = creatorFunc;
    this.onFinishFunc = onFinishFunc;
    this.finished = false;
  }

  // TODO FIX XXX: This is a (probably) temporary hack to avoid blowing
  // up the stack, but it means double queueing when the value is not
  // immediately available
  _continue(response: mixed): void {
    run(() => this.run(response));
  }

  _done(value: mixed): void {
    if (!this.finished) {
      this.finished = true;
      run(() => this.onFinishFunc(value));
    }
  }

  run(response: mixed): void {
    if (this.finished) {
      return;
    }

    // TODO: Shouldn't we (optionally) stop error propagation here (and
    // signal the error through a channel or something)? Otherwise the
    // uncaught exception will crash some runtimes (e.g. Node)
    const iter = this.gen.next(response);
    const ins = iter.value;

    if (iter.done) {
      this._done(ins);
    } else if (ins instanceof TakeInstruction) {
      takeThenCallback(ins.channel, value => this._continue(value));
    } else if (ins instanceof PutInstruction) {
      putThenCallback(ins.channel, ins.value, value => this._continue(value));
    } else if (ins instanceof SleepInstruction) {
      queueDelay(() => this.run(null), ins.msec);
    } else if (ins instanceof AltsInstruction) {
      doAlts(ins.operations, result => this._continue(result), ins.options);
    } else if (ins instanceof Channel) {
      takeThenCallback(ins, value => this._continue(value));
    } else {
      this._continue(ins);
    }
  }
}

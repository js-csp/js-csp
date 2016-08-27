// @flow
import { doAlts } from './select';
import { Box, Channel } from './channels';
import { run, queueDelay } from './dispatch';

export const NO_VALUE: Object = {};

export class FnHandler {
  blockable: boolean;
  func: ?Function;

  constructor(blockable: boolean, func: ?Function) {
    this.blockable = blockable;
    this.func = func;
  }

  isActive(): boolean {
    return true;
  }

  isBlockable(): boolean {
    return this.blockable;
  }

  commit(): ?Function {
    return this.func;
  }
}

export class Instruction<T> {
  static TAKE: string = 'take';
  static PUT: string = 'put';
  static SLEEP: string = 'sleep';
  static ALTS: string = 'alts';

  op: string;
  data: T;

  constructor(op: string, data: T) {
    this.op = op;
    this.data = data;
  }

  toString(): string {
    return this.op;
  }
}

export type IteratorYieldResultType =
  Instruction<Channel> | Instruction<{ channel: Channel, value: Object }> |
  Instruction<number> | Instruction<{ operations: Object[], options: Object }> |
  Channel | any;

export const putThenCallback = (channel: Channel, value: any, callback: ?Function): void => {
  const result: ?Box = channel._put(value, new FnHandler(true, callback));

  if (result && callback) {
    callback(result.value);
  }
};

export const takeThenCallback = (channel: Channel, callback: ?Function): void => {
  const result: ?Box = channel._take(new FnHandler(true, callback));

  if (result && callback) {
    callback(result.value);
  }
};

export class Process {
  gen: Generator<any, any, any>;
  onFinishFunc: Function;
  creatorFunc: Function;
  finished: boolean;

  constructor(gen: Generator<any, any, any>, onFinishFunc: Function, creatorFunc: Function) {
    this.gen = gen;
    this.creatorFunc = creatorFunc;
    this.onFinishFunc = onFinishFunc;
    this.finished = false;
  }

  _continue(response: any): void {
    // TODO FIX XXX: This is a (probably) temporary hack to avoid blowing
    // up the stack, but it means double queueing when the value is not
    // immediately available
    run(() => this.run(response));
  }

  _done(value: any): void {
    if (!this.finished) {
      this.finished = true;
      run(() => this.onFinishFunc(value));
    }
  }

  run(response: any): void {
    if (this.finished) {
      return;
    }

    // TODO: Shouldn't we (optionally) stop error propagation here (and
    // signal the error through a channel or something)? Otherwise the
    // uncaught exception will crash some runtimes (e.g. Node)
    const iter: IteratorResult<any, any> = this.gen.next(response);
    const ins: IteratorYieldResultType = iter.value;

    if (iter.done) {
      this._done(ins);
      return;
    }

    if (ins instanceof Instruction) {
      switch (ins.op) {
        case Instruction.PUT: {
          const { channel, value }: { channel: Channel, value: Object } = ins.data;
          putThenCallback(channel, value, (ok) => this._continue(ok));
          break;
        }

        case Instruction.TAKE: {
          const channel: Channel = ins.data;
          takeThenCallback(channel, (value) => this._continue(value));
          break;
        }

        case Instruction.SLEEP: {
          const msecs: number = ins.data;
          queueDelay(() => this.run(null), msecs);
          break;
        }

        case Instruction.ALTS: {
          doAlts(ins.data.operations, (result) => this._continue(result), ins.data.options);
          break;
        }

        default:
          throw new Error(`Unhandled instruction: ${ins.toString()}`);
      }
    } else if (ins instanceof Channel) {
      takeThenCallback(ins, (value) => this._continue(value));
    } else {
      this._continue(ins);
    }
  }
}

export const take = (channel: Channel): Instruction<Channel> =>
  new Instruction(Instruction.TAKE, channel);

export const put = (channel: Channel, value: Object): Instruction<{ channel: Channel, value: Object }> =>
  new Instruction(Instruction.PUT, { channel, value });

export const sleep = (msecs: number): Instruction<number> =>
  new Instruction(Instruction.SLEEP, msecs);

export const alts = (operations: Object[], options: Object): Instruction<{ operations: Object[], options: Object }> =>
  new Instruction(Instruction.ALTS, { operations, options });

export const poll = (channel: Channel): any => {
  if (channel.closed) {
    return NO_VALUE;
  }

  const result: ?Box = channel._take(new FnHandler(false));

  return result ? result.value : NO_VALUE;
};

export const offer = (channel: Channel, value: Object): boolean => {
  if (channel.closed) {
    return false;
  }

  const result: ?Box = channel._put(value, new FnHandler(false));

  return result instanceof Box;
};

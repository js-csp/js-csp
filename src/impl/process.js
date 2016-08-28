// @flow
import { doAlts } from './select';
import FnHandler from './fn-handler';
import Instruction from './instruction';
import { Box, Channel } from './channels';
import { run, queueDelay } from './dispatch';

export const NO_VALUE: Object = {};

export type TakeInstructionType = Instruction<Channel>;
export type PutInstructionType = Instruction<{ channel: Channel, value: Object }>;
export type SleepInstructionType = Instruction<number>;
export type AltsInstructionType = Instruction<{ operations: Channel[] | [Channel, any][], options: Object }>;

export const putThenCallback = (channel: Channel, value: any, callback: ?Function): void => {
  const result: ?Box = channel.put(value, new FnHandler(true, callback));

  if (result && callback) {
    callback(result.value);
  }
};

export const takeThenCallback = (channel: Channel, callback: ?Function): void => {
  const result: ?Box = channel.take(new FnHandler(true, callback));

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
    const iter = this.gen.next(response);
    const ins = iter.value;

    if (iter.done) {
      this._done(ins);
      return;
    }

    if (ins instanceof Instruction) {
      switch (ins.op) {
        case Instruction.TAKE: {
          takeThenCallback(ins.data, (value) => this._continue(value));
          break;
        }

        case Instruction.PUT: {
          putThenCallback(ins.data.channel, ins.data.value, (ok) => this._continue(ok));
          break;
        }

        case Instruction.SLEEP: {
          queueDelay(() => this.run(null), ins.data);
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

export const take = (channel: Channel): TakeInstructionType => new Instruction(Instruction.TAKE, channel);

export const put = (channel: Channel, value: Object): PutInstructionType => new Instruction(Instruction.PUT, { channel, value });

export const sleep = (msecs: number): SleepInstructionType => new Instruction(Instruction.SLEEP, msecs);

export const alts = (operations: Channel[] | [Channel, any][], options: Object): AltsInstructionType => new Instruction(Instruction.ALTS, { operations, options });

export const poll = (channel: Channel): any => {
  if (channel.closed) {
    return NO_VALUE;
  }

  const result: ?Box = channel.take(new FnHandler(false));

  return result ? result.value : NO_VALUE;
};

export const offer = (channel: Channel, value: Object): boolean => {
  if (channel.closed) {
    return false;
  }

  const result: ?Box = channel.put(value, new FnHandler(false));

  return result instanceof Box;
};

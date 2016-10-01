// @flow
import { doAlts } from './select';
import { FnHandler } from './handlers';
import Instruction from './instruction';
import { Box, Channel } from './channels';
import { run, queueDelay } from './dispatch';

export type TakeInstructionType = Instruction<Channel>;
export type PutInstructionType = Instruction<{ channel: Channel, value: Object }>;
export type SleepInstructionType = Instruction<number>;
export type AltsInstructionType = Instruction<{ operations: Channel[] | [Channel, any][], options: Object }>;
export type ProcessValueType = TakeInstructionType | PutInstructionType | SleepInstructionType | AltsInstructionType | Channel | any;

export const NO_VALUE = '@@process/NO_VALUE';

export function putThenCallback(channel: Channel, value: any, callback: ?Function): void {
  const result: ?Box<any> = channel.put(value, new FnHandler(true, callback));

  if (result && callback) {
    callback(result.value);
  }
}

export function takeThenCallback(channel: Channel, callback: ?Function): void {
  const result: ?Box<any> = channel.take(new FnHandler(true, callback));

  if (result && callback) {
    callback(result.value);
  }
}

export function take(channel: Channel): TakeInstructionType {
  return new Instruction(Instruction.TAKE, channel);
}

export function put(channel: Channel, value: Object): PutInstructionType {
  return new Instruction(Instruction.PUT, { channel, value });
}

export function sleep(msecs: number): SleepInstructionType {
  return new Instruction(Instruction.SLEEP, msecs);
}

export function alts(operations: Channel[] | [Channel, any][], options: Object): AltsInstructionType {
  return new Instruction(Instruction.ALTS, { operations, options });
}

export function poll(channel: Channel): Box<any> | typeof NO_VALUE {
  if (channel.closed) {
    return NO_VALUE;
  }

  const result: ?Box<any> = channel.take(new FnHandler(false));

  return result ? result.value : NO_VALUE;
}

export function offer(channel: Channel, value: Object): boolean {
  if (channel.closed) {
    return false;
  }

  const result: ?Box<any> = channel.put(value, new FnHandler(false));

  return result instanceof Box;
}

export class Process {
  gen: Generator<ProcessValueType, any, void>;
  onFinishFunc: Function;
  creatorFunc: Function;
  finished: boolean;

  constructor(gen: Generator<ProcessValueType, any, void>, onFinishFunc: Function, creatorFunc: Function) {
    this.gen = gen;
    this.creatorFunc = creatorFunc;
    this.onFinishFunc = onFinishFunc;
    this.finished = false;
  }

  // TODO FIX XXX: This is a (probably) temporary hack to avoid blowing
  // up the stack, but it means double queueing when the value is not
  // immediately available
  _continue(response: any): void {
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
    const iter: IteratorResult<ProcessValueType, any> = this.gen.next(response);
    const ins: ProcessValueType = iter.value;

    if (iter.done) {
      this._done(ins);
    } else if (ins instanceof Instruction) {
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

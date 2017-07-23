// @flow
import { Channel } from './channels';

export class TakeInstruction {
  channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }
}

export class PutInstruction {
  channel: Channel;
  value: mixed;

  constructor(channel: Channel, value: mixed) {
    this.channel = channel;
    this.value = value;
  }
}

export class SleepInstruction {
  msec: number;

  constructor(msec: number) {
    this.msec = msec;
  }
}

export class AltsInstruction {
  operations: Channel[] | [Channel, mixed][];
  options: Object;

  constructor(operations: Channel[] | [Channel, mixed][], options: Object) {
    this.operations = operations;
    this.options = options;
  }
}

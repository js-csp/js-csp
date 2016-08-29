export const DEFAULT: Object = {
  toString(): string {
    return '[object DEFAULT]';
  },
};

export class AltResult {
  value: any;
  channel: Channel | typeof DEFAULT;

  constructor(value: any, channel: Channel | typeof DEFAULT) {
    this.value = value;
    this.channel = channel;
  }
}

export type ResultType = AltResult;

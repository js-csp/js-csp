// @flow
import { Channel } from './channels';

export const DEFAULT: Object = {
  toString(): string {
    return '[object DEFAULT]';
  },
};

export class AltResult<T> {
  value: T;
  channel: Channel | typeof DEFAULT;

  constructor(value: T, channel: Channel | typeof DEFAULT) {
    this.value = value;
    this.channel = channel;
  }
}

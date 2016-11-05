// @flow
import { run } from './dispatch';
import type { RingBuffer } from './buffers';

export const taskScheduler = (func: Function, value: mixed): void => {
  run(() => func(value));
};

export const isReduced = (v: Object) => v && v['@@transducer/reduced'];

export function flush<T>(channelBuffer: RingBuffer<T>, callback: Function): void {
  while (channelBuffer.length > 0) {
    callback(channelBuffer.pop());
  }
}


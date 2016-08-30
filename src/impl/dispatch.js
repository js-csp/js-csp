// @flow
import { RingBuffer, ring } from './buffers';

const tasks: RingBuffer<Function> = ring();
const queueDispatcher = (): void => {
  // See the implementation of setImmediate at babel-runtime/core-js/set-immediate
  // https://github.com/zloirock/core-js/blob/e482646353b489e200a5ecccca6af5c01f0b4ef2/library/modules/_task.js
  // Under the hood, it will use process.nextTick, MessageChannel, and fallback to setTimeout
  setImmediate(() => {
    while (tasks.count() > 0) {
      tasks.pop()();
    }
  });
};

export const run = (func: Function): void => {
  tasks.unshift(func);
  queueDispatcher();
};

export const queueDelay = (func: Function, delay: number): void => {
  setTimeout(func, delay);
};

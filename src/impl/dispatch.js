// @flow
import { ring, EMPTY } from './buffers';

const tasks = ring();

// See the implementation of setImmediate at babel-runtime/core-js/set-immediate
// https://github.com/zloirock/core-js/blob/e482646353b489e200a5ecccca6af5c01f0b4ef2/library/modules/_task.js
// Under the hood, it will use process.nextTick, MessageChannel, and fallback to setTimeout
const queueDispatcher = (): void => {
  setImmediate(() => {
    for (let task = tasks.pop(); task !== EMPTY; task = tasks.pop()) {
      // Do we need to handle exceptions here?
      task();
    }
  });
};

export const run = (f: Function) => {
  tasks.unshift(f);
  queueDispatcher();
};

export const queueDelay = (f: Function, delay: number) => {
  setTimeout(f, delay);
};

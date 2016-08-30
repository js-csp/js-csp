// @flow
import { RingBuffer, ring } from './buffers';

const TASK_BATCH_SIZE: number = 1024;
const tasks: RingBuffer<Function> = ring();
let running: boolean = false;
let queued: boolean = false;

export const queueDispatcher = (): void => {
  // See the implementation of setImmediate at babel-runtime/core-js/set-immediate
  // https://github.com/zloirock/core-js/blob/e482646353b489e200a5ecccca6af5c01f0b4ef2/library/modules/_task.js
  // Under the hood, it will use process.nextTick, MessageChannel, and fallback to setTimeout
  if (!(queued && running)) {
    queued = true;

    setImmediate(() => {
      let count: number = 0;

      running = true;
      queued = false;

      while (count < TASK_BATCH_SIZE) {
        const task: ?Function = tasks.pop();

        if (task) {
          task();
          count++;
        } else {
          break;
        }
      }

      running = false;

      if (tasks.count() > 0) {
        queueDispatcher();
      }
    });
  }
};

export const run = (func: Function): void => {
  tasks.unshift(func);
  queueDispatcher();
};

export const queueDelay = (func: Function, delay: number): void => {
  setTimeout(func, delay);
};

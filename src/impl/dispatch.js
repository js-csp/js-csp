// @flow
import buffers from './buffers';

const tasks = buffers.ring(32);

const queueDispatcher = (): void => {
  setImmediate(() => {
    for (let task = tasks.pop(); task !== buffers.EMPTY; task = tasks.pop()) {
      task();
    }
  });
};

export const run = (f: Function) => {
  tasks.unbounded_unshift(f);
  queueDispatcher();
};

export const queueDelay = (f: Function, delay: number) => {
  setTimeout(f, delay);
};

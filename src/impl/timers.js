// @flow
import type { TimeoutType } from './dispatch';
import { queueDelay, removeDelay } from './dispatch';
import { chan, Channel, CLOSED } from './channels';
import { Process } from './process';

export function* stopTakingOnClose(ch: Channel): Generator<*, *, *> {
  while (CLOSED !== (yield ch)) ;
}

export function releaseTimerOnClose(ch: Channel, timer: TimeoutType): void {
  const release = removeDelay.bind(null, timer);
  new Process(stopTakingOnClose(ch), release, stopTakingOnClose).run();
}

export function timeout(msecs: number): Channel { // eslint-disable-line
  const ch: Channel = chan();
  const timer = queueDelay(() => ch.close(), msecs);
  releaseTimerOnClose(ch, timer);
  return ch;
}

// @flow
import type { TimeoutType } from './dispatch';
import { queueDelay } from './dispatch';
import { chan, Channel, CLOSED } from './channels';
import { Process } from './process';

export function* stopTakingOnClose(ch: Channel): Generator<*, *, *> {
  while (CLOSED !== (yield ch)) ;
}

function releaseTimer(ch: Channel, timer: TimeoutType): Process {
  const release = clearTimeout.bind(null, timer);
  return new Process(stopTakingOnClose(ch), release, stopTakingOnClose);
}

export function timeout(msecs: number): Channel { // eslint-disable-line
  const ch: Channel = chan();
  const timer = queueDelay(() => ch.close(), msecs);
  releaseTimer(ch, timer).run();
  return ch;
}

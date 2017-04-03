// @flow
import { queueDelay } from './dispatch';
import { chan, Channel } from './channels';

export function timeout(msecs: number): Channel {
  const ch: Channel = chan();
  queueDelay(() => ch.close(), msecs);
  return ch;
}

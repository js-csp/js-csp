// @flow
import { queueDelay } from './dispatch';
import { chan, Channel } from './channels';

export const timeout = (msecs: number): Channel => { // eslint-disable-line
  const ch: Channel = chan();

  queueDelay(() => ch.close(), msecs);

  return ch;
};

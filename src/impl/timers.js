// @flow
import { queueDelay } from './dispatch';
import channels from './channels';

export const timeout = (msecs: number) => { // eslint-disable-line
  const chan = channels.chan();

  queueDelay(() => chan.close(), msecs);

  return chan;
};

// @flow
import dispatch from './dispatch';
import channels from './channels';

export const timeout = (msecs: number) => {
  const chan = channels.chan();

  dispatch.queue_delay(() => chan.close(), msecs);

  return chan;
};

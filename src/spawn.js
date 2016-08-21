const buffers = require('./impl/buffers');
const channels = require('./impl/channels');
const process = require('./impl/process');

module.exports = function spawn(gen, creator) {
  const ch = channels.chan(buffers.fixed(1));

  (new process.Process(gen, (value) => {
    if (value === channels.CLOSED) {
      ch.close();
    } else {
      process.put_then_callback(ch, value, () => ch.close());
    }
  }, creator)).run();

  return ch;
};

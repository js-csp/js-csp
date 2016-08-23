const buffers = require('./impl/buffers');
const channels = require('./impl/channels');

module.exports = function chan(bufferOrNumber, xform, exHandler) {
  let buf;
  if (bufferOrNumber === 0) {
    bufferOrNumber = null;
  }
  if (typeof bufferOrNumber === 'number') {
    buf = buffers.fixed(bufferOrNumber);
  } else {
    buf = bufferOrNumber;
  }
  return channels.chan(buf, xform, exHandler);
};

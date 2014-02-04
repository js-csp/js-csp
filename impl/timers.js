var dispatch = require("./dispatch");
var channels = require("./channels");

function timeout(msecs) {
  var chan = channels.chan();
  dispatch.queue_delay(function() {
    chan.close();
  }, msecs);
  return chan;
}

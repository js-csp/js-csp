var csp = require("./csp");
var chan = csp.chan;
var go = csp.go;
var put = csp.put;
var take = csp.take;

var mocha = require("mocha");
var it = mocha.it;

function identity_chan(x) {
  var ch = chan(1);
  go(function*() {
    yield put(ch, x);
    ch.close();
  });
  return ch;
}

// it("", g(function*() {
// }));
function g(f) {
  return function(done) {
    go(f, [done]);
  };
};

// it_("", function*() {
// });
function it_(desc, f) {
  return it(desc, g(function*(done) {
    var ch = go(f, [], true);
    yield take(ch);
    done();
  }));
}

module.exports = {
  identity_chan: identity_chan,
  go: g,
  it: it_
};

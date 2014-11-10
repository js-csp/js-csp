"use strict";

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
    csp.spawn(f(done));
  };
};

function gg(f) {
  return g(function*(done) {
    try {
      var ch = go(f, []);
      yield take(ch);
      done();
    } catch(e) {
      done(e);
    }
  });
}

module.exports = {
  identity_chan: identity_chan,
  goAsync: g,
  go: gg,

  it: function(desc, f) {
    return mocha.it(desc, gg(f));
  },

  beforeEach: function(f) {
    return mocha.beforeEach(gg(f));
  },

  afterEach: function(f) {
    return mocha.afterEach(gg(f));
  },

  before: function(f) {
    return mocha.before(gg(f));
  },

  after: function(f) {
    return mocha.after(gg(f));
  }
};

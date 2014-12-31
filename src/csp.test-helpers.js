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

function check(f, done) {
  return (function() {
    try {
      f();
      done();
    } catch(e) {
      done(e);
    }
  })();
}

// it("", g(function*() {
// }));
function g(f) {
  return function(done) {
    go(f, [done]);
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
  check: check,
  goAsync: g,
  go: gg,

  // f must be a generator function. For now assertions should be inside f's
  // top-level, not functions f may call (that works but a failing test
  // may break following tests).
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

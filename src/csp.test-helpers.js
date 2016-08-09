import mocha from 'mocha';
import { chan, go as goroutine, put, take } from './csp';

export function identity_chan(x) {
  var ch = chan(1);
  goroutine(function*() {
    yield put(ch, x);
    ch.close();
  });
  return ch;
}

export function check(f, done) {
  return (function() {
    try {
      f();
      done();
    } catch(e) {
      done(e);
    }
  })();
}

export function goAsync(f) {
  return function(done) {
    goroutine(f, [done]);
  };
};

export function go(f) {
  return function (done) {
    goroutine(function *() {
      try {
        var ch = goroutine(f, []);
        yield take(ch);
        done();
      } catch(e) {
        done(e);
      }
    })
  };
}

// f must be a generator function. For now assertions should be inside f's
// top-level, not functions f may call (that works but a failing test
// may break following tests).
export const it = (desc, f) => mocha.it(desc, go(f));
export const beforeEach = (f) => mocha.beforeEach(go(f));
export const afterEach = (f) => mocha.afterEach(go(f));
export const before = (f) => mocha.before(go(f));
export const after = (f) => mocha.after(go(f));

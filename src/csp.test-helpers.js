// @flow
import mocha from 'mocha';
import { chan, go as goroutine, put, take } from './csp';

export const identityChan = (x: any) => {
  const ch = chan(1);

  goroutine(function* () {
    yield put(ch, x);
    ch.close();
  });

  return ch;
};

export const check = (f: Function, done: Function): void => {
  try {
    f();
    done();
  } catch (e) {
    done(e);
  }
};

export const goAsync = (f: Generator<any, any, any>): Function => (done: Function): void => {
  goroutine(f, [done]);
};

export const go = (f: Generator<any, any, any>) => (done: Function) => {
  goroutine(function* () {
    try {
      const ch = goroutine(f, []);
      yield take(ch);
      done();
    } catch (e) {
      done(e);
    }
  });
};

// f must be a generator function. For now assertions should be inside f's
// top-level, not functions f may call (that works but a failing test
// may break following tests).
export const it = (desc: string, f: Generator<any, any, any>): void => mocha.it(desc, go(f));

export const beforeEach = (f: Generator<any, any, any>): void => mocha.beforeEach(go(f));

export const afterEach = (f: Generator<any, any, any>): void => mocha.afterEach(go(f));

export const before = (f: Generator<any, any, any>): void => mocha.before(go(f));

export const after = (f: Generator<any, any, any>): void => mocha.after(go(f));

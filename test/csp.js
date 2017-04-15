/* eslint-disable require-yield, no-empty-function */
import mocha from 'mocha';
import { assert } from 'chai';
import {
  it,
  identityChan,
  check,
  before,
  beforeEach,
} from './../src/csp.test-helpers';
import {
  chan,
  promiseChan,
  go,
  put,
  take,
  putAsync,
  takeAsync,
  offer,
  poll,
  alts,
  timeout,
  DEFAULT,
  CLOSED,
  NO_VALUE,
} from './../src/csp';
import { doAlts } from './../src/impl/select';

function closed(chanCons) {
  const ch = chanCons();
  ch.close();
  return ch;
}

describe('put', () => {
  describe('that is immediate', () => {
    it('should return true if value is taken', function*() {
      const ch = chan();
      go(function*() {
        yield take(ch);
      });
      assert.equal(yield put(ch, 42), true);
    });

    it('should return true if value is buffered', function*() {
      const ch = chan(1);
      assert.equal(yield put(ch, 42), true);
    });

    it('should return false if channel is already closed', function*() {
      const ch = closed(chan);
      assert.equal(yield put(ch, 42), false);
    });
  });

  describe('that is parked', () => {
    it('should return true if value is then taken', function*() {
      const ch = chan();
      go(function*() {
        yield timeout(5);
        yield take(ch);
      });
      assert.equal(yield put(ch, 42), true);
    });

    // it('should return true if value is then buffered', function* () {
    //   var ch = chan(1);
    //   var buffered = false;

    //   go(function* () {
    //     yield put(ch, 42);
    //   });
    //   go(function* () {
    //     assert.equal((yield put(ch, 43)), true);
    //     buffered = true;
    //   });

    //   yield take(ch);

    //   // So that the code after the 43-put has the chance to run
    //   yield 1;

    //   assert.equal(buffered, true, 'pending put is buffered once the buffer is not full again');
    // });

    it('should return false if channel is then closed', function*() {
      const ch = chan();

      go(function*() {
        yield timeout(5);
        ch.close();

        // XXX FIX: Throwing an exception here (in a 'non-top-level'
        // goroutine) makes the alts test crash with a weird 'Cannot
        // call method 'take' of undefined'. It goes away if
        // Process.prototype.run handles exceptions throw by the
        // generator. It looks like it has to do with mocha's 'done'
        // needs to be called for async test to be cleanedly cleaned
        // up. Yikes! Another way to handle it is to catch the
        // exception and call 'done' in the test helpers. Actually no,
        // it makes the next tests incorrect. The problem is exception
        // from 'non-top-level' goroutines not being handled. Not sure
        // how to fix yet. throw new Error('Ha ha');
      });

      assert.equal(yield put(ch, 42), false);
    });

    // http://onbeyondlambda.blogspot.com/2014/04/asynchronous-naivete.html
    mocha.it(
      'should be moved to the buffer when a value is taken from it',
      done => {
        const ch = chan(1);
        let count = 0;

        function inc() {
          count += 1;
        }

        putAsync(ch, 42, inc);
        putAsync(ch, 42, inc);
        takeAsync(ch, () => {
          go(function*() {
            yield null;
            check(
              () => {
                assert.equal(count, 2);
              },
              done
            );
          });
        });
      }
    );
  });
});

describe('take', () => {
  describe('that is immediate', () => {
    it('should return correct value that was directly put', function*() {
      const ch = chan();
      go(function*() {
        yield put(ch, 42);
      });
      assert.equal(yield take(ch), 42);
    });

    it('should return correct value that was buffered', function*() {
      const ch = chan(1);
      yield put(ch, 42);
      assert.equal(yield take(ch), 42);
    });

    it('should return false if channel is already closed', function*() {
      const ch = closed(chan);
      assert.equal(yield take(ch), CLOSED);
    });
  });

  describe('that is parked', () => {
    it('should return correct value if it is then delivered', function*() {
      const ch = chan();
      go(function*() {
        yield timeout(5);
        yield put(ch, 42);
      });
      assert.equal(yield take(ch), 42);
    });

    it('should return CLOSED if channel is then closed', function*() {
      const ch = chan();

      go(function*() {
        yield timeout(5);
        ch.close();
      });

      assert.equal(yield take(ch), CLOSED);
    });
  });
});

describe('offer and poll', () => {
  function noOp() {}

  mocha.it(
    'should succeed if they can be completed immediately by a buffer',
    () => {
      const ch = chan(2);
      assert.equal(offer(ch, 42), true);
      assert.equal(offer(ch, 43), true);
      assert.equal(offer(ch, 44), false);
      assert.equal(poll(ch), 42);
      assert.equal(poll(ch), 43);
      assert.equal(poll(ch), NO_VALUE);
    }
  );

  mocha.it(
    'should succeed if they can be completed immediately by a pending operation',
    () => {
      const putCh = chan();
      putAsync(putCh, 42);
      assert.equal(poll(putCh), 42);

      const takeCh = chan();
      takeAsync(takeCh, noOp);
      assert.equal(offer(takeCh, 42), true);
    }
  );

  mocha.it("should fail if they can't complete immediately", () => {
    const ch = chan();
    assert.equal(poll(ch), NO_VALUE);
    assert.equal(offer(ch, 44), false);
  });

  mocha.it('should fail if they are performed on a closed channel', () => {
    const ch = chan();
    ch.close();
    assert.equal(poll(ch), NO_VALUE);
    assert.equal(offer(ch, 44), false);
  });

  mocha.it(
    'should fail if there are pending same-direction operations on a channel',
    () => {
      const putCh = chan();
      putAsync(putCh, 42);
      assert.equal(offer(putCh, 44), false);

      const takeCh = chan();
      takeAsync(takeCh, noOp);
      assert.equal(poll(takeCh), NO_VALUE);
    }
  );
});

describe('alts', () => {
  function takeReadyFromPut(v) {
    const ch = chan();
    putAsync(ch, v);
    return ch;
  }

  function takeReadyFromBuf(v) {
    const ch = chan(1);
    putAsync(ch, v);
    return ch;
  }

  function noOp() {}

  function putReadyByTake() {
    const ch = chan();
    takeAsync(ch, noOp);
    return ch;
  }

  function putReadyByBuf() {
    const ch = chan(1);
    return ch;
  }

  // To help with testing once-only (i.e. commit logic is correct).
  function once(desc, f, ops) {
    it(`should commit correctly after ${desc}`, function*() {
      let count = 0;

      function inc() {
        count += 1;
      }

      const l = ops.length;
      const chs = new Array(l);
      for (let i = 0; i < l; i += 1) {
        const op = ops[i];
        if (op instanceof Array) {
          chs[i] = op[0];
        } else {
          chs[i] = op;
        }
      }

      // We want to test that an immediately-available-due-to-closed
      // operation deactivates previously registered operations.
      // Therefore we use 'priority' to make sure an already-ready
      // operation that comes last does not short-circuit doAlts.
      doAlts(ops, inc, { priority: true });

      yield* f.apply(this, chs);
      // One more turn for async operations scheduled by f above.
      yield null;

      assert.equal(count, 1);
    });
  }

  it('should work with identity channel', function*() {
    const ch = identityChan(42);
    const r = yield alts([ch]);
    assert.equal(r.value, 42);
    assert.equal(r.channel, ch);
  });

  describe('implementation', () => {
    describe('should not be bugged by js mutable closure', () => {
      it('when taking', function*() {
        const ch1 = chan();
        const ch2 = chan();

        const ch = go(function*() {
          // FIX: Make it reliable against assertions in spawned
          // goroutines (requiring a finalized error handling strategy).
          return yield alts([ch1, ch2], { priority: true });
        });

        go(function*() {
          yield put(ch1, 1);
        });

        const r = yield take(ch);
        assert.equal(r.channel, ch1);
        assert.equal(r.value, 1);
      });

      it('when putting', function*() {
        const ch1 = chan();
        const ch2 = chan();

        const ch = go(function*() {
          return yield alts([[ch1, 1], [ch2, 1]], { priority: true });
        });

        go(function*() {
          yield take(ch1);
        });

        const r = yield take(ch);
        assert.equal(r.channel, ch1);
        assert.equal(r.value, true);
      });
    });
  });

  describe('default value', () => {
    let ch;

    before(function*() {
      ch = chan(1);
    });

    it('should be returned if no result is immediately available', function*() {
      const r = yield alts([ch], { default: 'none' });
      assert.equal(r.value, 'none');
      assert.equal(r.channel, DEFAULT);
    });

    it('should be ignored if some result is immediately available', function*() {
      yield put(ch, 1);
      const r = yield alts([ch], { default: 'none' });
      assert.equal(r.value, 1);
      assert.equal(r.channel, ch);
    });
  });

  // FIX: These tests are bad (having (small) chances to pass/fail
  // incorrectly)
  describe('ordering', () => {
    const n = 100;
    const chs = new Array(n);
    const sequential = new Array(n);

    before(function*() {
      for (let i = 0; i < n; i += 1) {
        sequential[i] = i;
      }
    });

    beforeEach(function*() {
      for (let i = 0; i < n; i += 1) {
        chs[i] = chan(1);
        yield put(chs[i], i);
      }
    });

    it('should be non-deterministic by default', function*() {
      const results = new Array(n);
      for (let i = 0; i < n; i += 1) {
        results[i] = (yield alts(chs)).value;
      }
      assert.notDeepEqual(sequential, results, 'alts ordering is randomized');
    });

    it('should follow priority if requested', function*() {
      const results = new Array(n);
      for (let i = 0; i < n; i += 1) {
        results[i] = (yield alts(chs, { priority: true })).value;
      }
      assert.deepEqual(
        sequential,
        results,
        'alts ordering is fixed if priority option is specified'
      );
    });
  });

  describe('synchronization (at most once guarantee)', () => {
    once(
      'taking from a queued put',
      function*(ch1) {
        putAsync(ch1, 2);
      },
      [chan(), takeReadyFromPut(1)]
    );

    once(
      'taking from the buffer',
      function*(ch1) {
        putAsync(ch1, 2);
      },
      [chan(), takeReadyFromBuf(1)]
    );

    once(
      'taking from a closed channel',
      function*(ch1) {
        putAsync(ch1, 2);
      },
      [chan(), closed(chan)]
    );

    once(
      'putting to a queued take',
      function*(ch1) {
        takeAsync(ch1, noOp);
      },
      [[chan(), 1], [putReadyByTake(), 2]]
    );

    once(
      'putting to the buffer',
      function*(ch1) {
        takeAsync(ch1, noOp);
      },
      [[chan(), 1], [putReadyByBuf(), 2]]
    );

    once(
      'putting to a closed channel',
      function*(ch1) {
        takeAsync(ch1, noOp);
      },
      [[chan(), 1], [closed(chan), 2]]
    );
  });
});

describe('Goroutine', () => {
  it('should put returned value on output channel and close it', function*() {
    const ch = go(
      function*(x) {
        return x;
      },
      [42]
    );
    const value = yield take(ch);
    assert.equal(value, 42, 'returned value is delivered');
    assert.equal(ch.isClosed(), true, 'output channel is closed');
  });

  it('should leave yielded normal values untouched', function*() {
    const lst = [
      42,
      [42],
      { x: 42 },
      '',
      null,
      undefined,
      true,
      false,
      () => {},
      function*() {},
    ];
    const length = lst.length;
    for (let i = 0; i < length; i += 1) {
      assert.equal(yield lst[i], lst[i]);
    }
  });

  it('should work when special value CLOSED is returned', function*() {
    const ch = go(
      function*(x) {
        return x;
      },
      [CLOSED]
    );
    const value = yield take(ch);
    assert.equal(value, CLOSED, 'CLOSED is delivered');
    assert.equal(ch.isClosed(), true, 'output channel is closed');
  });
});

describe('Process runner', () => {
  // TODO: See if this is sufficiently large for all the runtimes (js
  // can't query stack depth)
  const LIMIT = 25000;
  const ch = closed(chan);

  it('should not blow the stack on repeated takes from a closed channel', function*() {
    for (let i = 0; i < LIMIT; i += 1) {
      yield take(ch);
    }
  });

  it('should not blow the stack on repeated puts on a closed channel', function*() {
    for (let i = 0; i < LIMIT; i += 1) {
      yield put(ch, 1);
    }
  });

  it('should not blow the stack on repeated selects on a closed channel', function*() {
    for (let i = 0; i < LIMIT; i += 1) {
      yield alts([ch, [ch, 1]]);
    }
  });

  it('should not blow the stack on repeated puts and takes that are immediate', function*() {
    const _ch = chan(1);
    for (let i = 0; i < LIMIT; i += 1) {
      yield put(_ch, 1);
      yield take(_ch);
    }
  });
});

describe('close', () => {
  it('should correctly flush false to pending puts', function*() {
    const ch = chan();
    let count = 0;

    go(function*() {
      assert.equal(yield put(ch, 1), false);
      count += 1;
      assert.equal(count, 1);
    });
    go(function*() {
      assert.equal(yield put(ch, 2), false);
      count += 1;
      assert.equal(count, 2);
    });
    go(function*() {
      assert.equal(yield put(ch, 3), false);
      count += 1;
      assert.equal(count, 3);
    });

    ch.close();
    yield undefined;
  });

  it('should correctly flush CLOSED to pending takes', function*() {
    const ch = chan();
    let count = 0;

    go(function*() {
      assert.equal(yield take(ch), CLOSED);
      count += 1;
      assert.equal(count, 1);
    });
    go(function*() {
      assert.equal(yield take(ch), CLOSED);
      count += 1;
      assert.equal(count, 2);
    });
    go(function*() {
      assert.equal(yield take(ch), CLOSED);
      count += 1;
      assert.equal(count, 3);
    });

    ch.close();
    yield undefined;
  });
});

describe('promiseChan', () => {
  describe('put on', () => {
    it('should fulfill all pending takers', function*() {
      const pCh = promiseChan();
      const t1 = go(function*() {
        return yield take(pCh);
      });
      const t2 = go(function*() {
        return yield take(pCh);
      });
      const originalValue = 'original value';

      yield put(pCh, originalValue);

      assert.equal(yield take(t1), originalValue);
      assert.equal(yield take(t2), originalValue);

      // then puts succeed but are dropped
      yield put(pCh, 'new value');
      assert.equal(yield take(pCh), originalValue);
      assert.equal(yield take(pCh), originalValue);

      // then after close takes continue returning val
      pCh.close();
      assert.equal(yield take(pCh), originalValue);
      assert.equal(yield take(pCh), originalValue);
    });
  });

  describe('close on', () => {
    it('should fulfill all pending takers', function*() {
      const pCh = promiseChan();
      const t1 = go(function*() {
        return yield take(pCh);
      });
      const t2 = go(function*() {
        return yield take(pCh);
      });

      pCh.close();

      assert.equal(yield take(t1), null);
      assert.equal(yield take(t2), null);
    });
  });

  describe('close after put on', () => {
    it('should continues delivering promised value', function*() {
      const pCh = promiseChan();
      const originalValue = 'original value';

      yield put(pCh, originalValue);

      assert.equal(yield take(pCh), originalValue);
      assert.equal(yield take(pCh), originalValue);

      pCh.close();

      assert.equal(yield take(pCh), originalValue);
      assert.equal(yield take(pCh), originalValue);
    });
  });
});

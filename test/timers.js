/* eslint-disable require-yield */
import { assert } from 'chai';
import { queueDelay } from './../src/impl/dispatch';
import { releaseTimerOnClose, stopTakingOnClose } from './../src/impl/timers';
import { chan, go, spawn, take, put, alts, timeout, CLOSED } from './../src/csp';

const MS_10S = 1000 * 10;

function assertTimerRunning(ch, timer) {
  assert.notOk(ch.closed);
  assert.notOk(timer._called);
  assert.notEqual(timer._idleTimeout, -1);
}

function assertTimerReleased(ch, timer, done) {
  assert.ok(ch.closed);
  assert.notOk(timer._called);
  assert.equal(timer._idleTimeout, -1);
  done();
}

function* clientG(ch, ms) {
  const gc = timeout(ms);
  try {
    yield gc;
    yield put(ch, 42);
  }
  finally {
    return gc.close(); // eslint-disable-line
  }
}

function* resultG(ch, ms) {
  const cancel = timeout(ms);
  const result = yield alts([ch, cancel]);
  return { result, cancel };
}

describe('Timers', () => {
  describe('timeout', () => {
    it('should close channel after specified timeout', (done) => {
      const targetCh = chan();
      const client = clientG(targetCh, MS_10S), resultP = resultG(targetCh, 0);
      const clientCh = spawn(client), resultCh = spawn(resultP);
      const assertCancelClosed = ({ result, cancel }) => {
        assert.strictEqual(result.channel, cancel);
        assert.ok(cancel.closed);
      };
      go(function* () {
        assertCancelClosed(yield take(resultCh));
        client.return(); //closes channel
        yield clientCh;
        done();
      });
    });
    it('should use #releaseTimerOnClose handler for timer cleanup on channel close', (done) => {
      const ll = Array.from({ length: 100 }, () => timeout(200));
      go(function* closeWithPuts() {
        for(let ch of ll) {
          yield put(ch, 42);
          yield timeout(0);
          ch.close();
          assert.equal(yield take(ch), CLOSED);
          assert.ok(ch.closed);
        }
        done();
      });
    });
  });
  describe('releaseTimerOnClose (Node timers)', () => {
    it('should release timer on channel close', (done) => {
      const ch = chan();
      const timer = queueDelay(() => ch.close(), MS_10S);
      releaseTimerOnClose(ch, timer);
      assertTimerRunning(ch, timer);
      go(function* () {
        yield ch;
        assertTimerReleased(ch, timer, done);
      });
      ch.close();
    });
  });
  describe('stopTakingOnClose', () => {
    it('should keep polling input channel until closed', (done) => {
      const ch = chan();
      const tracker = go(stopTakingOnClose, [ch]);
      const assertClosed = () => {
        assert.ok(ch.closed);
        done();
      };
      go(function* () {
        yield put(ch, 42);
        assertClosed(yield tracker);
      });
      ch.close();
    });
  });
});

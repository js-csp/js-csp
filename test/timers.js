/* eslint-disable require-yield */
import mocha from 'mocha';
import { assert } from 'chai';
//import { it, beforeEach } from './../src/csp.test-helpers';
import { stopTakingOnClose } from './../src/impl/timers';
import { chan, go, put, operations, CLOSED } from './../src/csp';

describe('Utils', () => {
    describe('stopTakingOnClose', () => {
        it('should terminate once input channel is closed', function(done) {
            const ch = chan()
            const tracker = go(stopTakingOnClose, [ch])
            const assertClosed = () => {
                assert.ok(ch.closed)
                done()
            }
            go(function*() {
                yield put(ch, true)
                assertClosed(yield tracker)
            })
            ch.close()
        })
    })
})

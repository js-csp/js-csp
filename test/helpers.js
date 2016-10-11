/* eslint-disable require-yield */
import { assert } from 'chai';
import {
  before,
  after,
  beforeEach,
  afterEach,
  check,
  goAsync,
  go as goTest,
  it as itTest,
} from '../src/csp.test-helpers';
import { go } from '../src/csp';

describe('Test helpers', () => {
  let running = false;
  let started = false;
  // FIX: 'after' is not tested yet

  before(function* () {
    started = true;
  });

  after(function* () {
    assert.equal(started, true);
  });

  beforeEach(function* () {
    assert.equal(started, true, '\'before\' hook was run');
    assert.equal(running, false, 'last \'afterEach\' hook was run');
    running = true;
  });

  afterEach(function* () {
    assert.equal(started, true, '\'before\' hook was run');
    assert.equal(running, true, '\'beforeEach\' hook was run');
    running = false;
  });

  it('should run with no sugar', done => {
    go(function* () {
      check(() => {
        assert.equal(running, true, '\'beforeEach\' hook was run');
      }, done);
    });
  });

  it('should run with 1 layer of sugar', goAsync(function* (done) {
    check(() => {
      assert.equal(running, true, '\'beforeEach\' hook was run');
    }, done);
  }));

  it('should run with 2 layers of sugar', goTest(function* () {
    assert.equal(running, true, '\'beforeEach\' hook was run');
  }));

  itTest('should run with 3 layers of sugar', function* () {
    assert.equal(running, true, '\'beforeEach\' hook was run');
  });
});

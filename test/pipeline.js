import { assert } from 'chai';
import * as transducers from 'transducers.js';
import { it } from './../src/csp.test-helpers';
import * as csp from './../src/csp';

const pipeline = csp.operations.pipeline;
const pipelineAsync = csp.operations.pipelineAsync;

function pipelineTester(pipelineFunction, n, inputs, xf) {
  const cin = csp.operations.fromColl(inputs);
  const cout = csp.chan(1);

  if (n !== null) {
    pipelineFunction(n, cout, xf, cin);
  } else {
    pipelineFunction(cout, xf, cin);
  }

  const results = [];

  return csp.go(
    function*(_results) {
      for (;;) {
        const val = yield csp.take(cout);
        if (val !== csp.CLOSED) {
          _results.push(val);
        } else {
          break;
        }
      }

      return _results;
    },
    [results]
  );
}

function identity(n) {
  return n;
}

function identityAsync(v, ch) {
  return csp.go(function*() {
    yield csp.put(ch, v);
    ch.close();
  });
}

function testSizeAsync(n, size) {
  const r = [];

  for (let i = 0; i < size; i += 1) {
    r.push(i);
  }

  return csp.go(function*() {
    const tester = pipelineTester(pipelineAsync, n, r, identityAsync);
    const result = yield csp.take(tester);

    assert.deepEqual(result, r);
  });
}

function testSizeCompute(size) {
  const r = [];

  for (let i = 0; i < size; i += 1) {
    r.push(i);
  }

  return csp.go(function*() {
    const result = yield csp.take(
      pipelineTester(pipeline, null, r, transducers.map(identity))
    );

    assert.deepEqual(result, r);
  });
}

describe('pipeline-test-sizes', () => {
  it('pipeline async test size', function*() {
    yield csp.take(testSizeAsync(1, 0));
    yield csp.take(testSizeAsync(1, 10));
    yield csp.take(testSizeAsync(10, 10));
    yield csp.take(testSizeAsync(20, 10));
    yield csp.take(testSizeAsync(5, 1000));
  });

  it('pipeline compute test size', function*() {
    yield csp.take(testSizeCompute(1, 0));
    yield csp.take(testSizeCompute(1, 10));
    yield csp.take(testSizeCompute(1, 1000));
  });
});

describe('test-close', () => {
  it('should work', function*() {
    let cout = csp.chan(1);
    pipeline(cout, transducers.map(identity), csp.operations.fromColl([1]));

    assert.equal(1, yield csp.take(cout));
    assert.equal(csp.CLOSED, yield csp.take(cout));

    cout = csp.chan(1);
    pipeline(
      cout,
      transducers.map(identity),
      csp.operations.fromColl([1]),
      true
    );

    assert.equal(1, yield csp.take(cout));
    yield csp.put(cout, 'more');

    assert.equal('more', yield csp.take(cout));

    cout = csp.chan(1);
    pipeline(
      cout,
      transducers.map(identity),
      csp.operations.fromColl([1]),
      true
    );

    assert.equal(1, yield csp.take(cout));
    yield csp.put(cout, 'more');

    assert.equal('more', yield csp.take(cout));
  });
});

describe('async-pipelines-af-multiplier', () => {
  it('shoud work', function*() {
    function multiplierAsync(v, ch) {
      csp.go(
        function*(_v, _ch) {
          for (let i = 0; i < _v; i += 1) {
            yield csp.put(_ch, i);
          }
          _ch.close();
        },
        [v, ch]
      );

      return ch;
    }

    const range = [1, 2, 3, 4];
    const g = csp.go(function*() {
      const pipelineResult = pipelineTester(
        pipelineAsync,
        2,
        range,
        multiplierAsync
      );
      assert.deepEqual(
        [0, 0, 1, 0, 1, 2, 0, 1, 2, 3],
        yield csp.take(pipelineResult)
      );
    });

    yield csp.take(g);
  });
});

describe('pipeline-async', () => {
  function incrementerAsync(v, ch) {
    return csp.go(
      function*(_v, _ch) {
        yield csp.put(_ch, _v + 1);
        _ch.close();
      },
      [v, ch]
    );
  }

  it('should work', function*() {
    const r = [];
    const r2 = [];
    for (let i = 0; i < 100; i += 1) {
      r.push(i);
    }

    for (let j = 1; j < 101; j += 1) {
      r2.push(j);
    }

    const g = csp.go(function*() {
      const pipelineResult = pipelineTester(
        pipelineAsync,
        1,
        r,
        incrementerAsync
      );
      assert.deepEqual(r2, yield csp.take(pipelineResult));
    });

    yield csp.take(g);
  });
});

var assert = require("chai").assert;
var a = require("../src/csp.test-helpers"),
    it = a.it,
    before = a.before,
    afterEach = a.afterEach,
    beforeEach = a.beforeEach;

var csp = require("../src/csp");
var t = require('transducers.js');

var pipeline = csp.operations.pipeline;
var pipelineAsync = csp.operations.pipelineAsync;

function pipelineTester(pipelineFunction, n, inputs, xf) {
    var cin = csp.operations.fromColl(inputs);
    var cout = csp.chan(1);

    pipelineFunction(n, cout, xf, cin);

    var results = [];

    return csp.go(function* (results) {
        while(true) {
            var val = yield csp.take(cout);
            if (val !== csp.CLOSED) {
                results.push(val);
            } else {
                break;
            }
        }

        return results;
    },[results]);

}

function identity(n) {
    return n;
}

function identityAsync(v, ch) {
    return csp.go(function* () {
        yield csp.put(ch, v);
        ch.close();
    });
}




function testSizeAsync(n, size) {
    var r = [];

    for (var i = 0; i < size; i++) {
        r.push(i);
    }

    return csp.go(function* () {
        var tester = pipelineTester(pipelineAsync, n, r, identityAsync);
        var result = yield csp.take(tester);

        assert.deepEqual(result, r);
    });
}

function testSizeCompute(n, size) {
    var r = [];

    for (var i = 0; i< size; i++) {
        r.push(i);
    }

    return csp.go(function*() {
        var result = yield csp.take(pipelineTester(pipeline, n, r, t.map(identity)));

        assert.deepEqual(result, r);
    });
}


describe('pipeline-test-sizes', function() {
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
        yield csp.take(testSizeCompute(10, 10));
        yield csp.take(testSizeCompute(20, 10));
        yield csp.take(testSizeCompute(5, 1000));
    });
});


describe('test-close', function() {
    it('should work', function*() {
        var cout = csp.chan(1);
        pipeline(5, cout, t.map(identity), csp.operations.fromColl([1]), true);

        assert.equal(1, yield csp.take(cout));
        assert.equal(csp.CLOSED, yield csp.take(cout));

        cout = csp.chan(1);
        pipeline(5, cout, t.map(identity), csp.operations.fromColl([1]), false);

        assert.equal(1, yield csp.take(cout));
        yield csp.put(cout, 'more');

        assert.equal('more', yield csp.take(cout));

        cout = csp.chan(1);
        pipeline(5, cout, t.map(identity), csp.operations.fromColl([1]), null);

        assert.equal(1, yield csp.take(cout));
        yield csp.put(cout, 'more');

        assert.equal('more', yield csp.take(cout));

    });

});

describe('async-pipelines-af-multiplier', function() {
    it('shoud work', function*() {

        function multiplierAsync(v, ch) {
            csp.go(function* (v, ch) {
                for(var i = 0; i < v; i++) {
                    yield csp.put(ch, i);
                }
                ch.close();
            }, [v, ch]);

            return ch;
        }

        var range = [1,2,3,4];
        var g = csp.go(function*() {
            var pipelineResult = pipelineTester(pipelineAsync, 2, range, multiplierAsync);
            assert.deepEqual([0,0,1,0,1,2,0,1,2,3], yield csp.take(pipelineResult));
        });

        yield csp.take(g);
    });
});

describe('pipeline-async', function() {
    function incrementerAsync(v, ch) {
        return csp.go(function* (v, ch) {
            yield csp.put(ch, v + 1);
            ch.close();
        }, [v, ch]);
    }

    it('should work', function*() {
        var r = [];
        var r2 = [];
        for(var i = 0;i < 100;i++) {
            r.push(i);
        }

        for(var j = 1;j < 101;j++) {
            r2.push(j);
        }

        var g = csp.go(function*() {
            var pipelineResult = pipelineTester(pipelineAsync, 1, r, incrementerAsync);
            assert.deepEqual(r2, yield csp.take(pipelineResult));
        });

        yield csp.take(g);

    });
});
"use strict";

var csp = require('./csp.core');

function pipeline(n, to, xf, from, close, exHandler, type) {
    if (n < 0) {
        throw new Error('n must be positive');
    }

    close = close === undefined ? true : close;
    type = type || 'compute';

    var jobs = csp.chan(n);
    var results = csp.chan(n);

    var process = function(job) {
        if (job === csp.CLOSED) {
            results.close();

            return null;
        } else {
            var v = job[0];
            var p = job[1];
            var res = csp.chan(1, xf, exHandler);

            csp.go(function* (res, v) {
                yield csp.put(res, v);
                res.close();
            }, [res, v]);

            csp.putAsync(p, res);

            return true;
        }
    };

    var async = function(job) {
        if (job === csp.CLOSED) {
            results.close();
            return null;
        } else {
            var v = job[0];
            var p = job[1];
            var res = csp.chan(1);
            xf(v, res);
            csp.putAsync(p, res);
            return true;
        }
    };

    for(var _ = 0; _ < n; _++) {

        csp.go(function* (t, jobs, async, process) {
            while (true) {
                var job = yield csp.take(jobs);

                if (t === 'async') {
                    if (!async(job)) {
                        break;
                    }
                } else {
                    if (!process(job)) {
                        break;
                    }
                }
            }
        }, [type, jobs, async, process]);

    }

    csp.go(function* (jobs, from, results) {
        while (true) {
            var v = yield csp.take(from);
            if (v === csp.CLOSED) {
                jobs.close();
                break;
            } else {
                var p = csp.chan(1);

                yield csp.put(jobs, [v, p]);
                yield csp.put(results, p);
            }
        }

    }, [jobs, from, results]);

    csp.go(function* (results, close, to) {
        while(true) {
            var p = yield csp.take(results);
            if (p === csp.CLOSED) {
                if (close) {
                    to.close();
                }
                break;
            } else {
                var res = yield csp.take(p);
                while(true) {
                    var v = yield csp.take(res);
                    if (v !== csp.CLOSED) {
                        yield csp.put(to, v);
                    } else {
                        break;
                    }
                }
            }
        }
    }, [results, close, to]);

    return to;
}


function pipelineAsync(n, to, af, from, close) {
    return pipeline(n, to, af, from, close, null, 'async');
}

module.exports = {
    pipeline: pipeline,
    pipelineAsync: pipelineAsync
};
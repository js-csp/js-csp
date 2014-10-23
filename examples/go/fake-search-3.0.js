"use strict";

// http://talks.golang.org/2012/concurrency.slide#50

// Reduce tail latency using replicated search servers.

var csp = require("../../src/csp"),
    go = csp.go, chan = csp.chan,
    put = csp.put, take = csp.take, alts = csp.alts,
    timeout = csp.timeout, timeout = csp.timeout;

function fakeSearch(kind) {
  return function*(query) {
    yield timeout(Math.random() * 200);
    return kind  + " result for query " + query;
  };
}

var web1 = fakeSearch("web1");
var web2 = fakeSearch("web2");
var image1 = fakeSearch("image1");
var image2 = fakeSearch("image2");
var video1 = fakeSearch("video1");
var video2 = fakeSearch("video2");

function* first(query, replicas) {
  var ch = chan();
  function* searchReplica(i) {
    yield put(ch, (yield* replicas[i](query)));
  }
  for (var i = 0; i < replicas.length; i++) {
    go(searchReplica, [i]);
  }
  return (yield take(ch));
}

function* google(query) {
  var ch = chan();

  go(function*() {
    yield put(ch, (yield* first(query, [web1, web2])));
  });
  go(function*() {
    yield put(ch, (yield* first(query, [image1, image2])));
  });
  go(function*() {
    yield put(ch, (yield* first(query, [video1, video2])));
  });

  var t = csp.timeout(80);

  var results = [];
  for (var i = 0; i < 3; i++) {
    var r = yield alts([ch, t]);
    if (r.channel === ch) {
      results.push(r.value);
    } else {
      console.log("timed out");
      break;
    }
  }

  return results;
}

go(function*() {
  var start = new Date();
  var results = yield* google("PLT");
  var elapsed = new Date() - start;
  console.log(results.join("\n"));
  console.log(elapsed);
});

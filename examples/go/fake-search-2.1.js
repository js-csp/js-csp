"use strict";

// http://talks.golang.org/2012/concurrency.slide#47

// Don't wait for slow servers.

var csp = require("../../src/csp"),
    go = csp.go, chan = csp.chan,
    put = csp.put, take = csp.take, alts = csp.alts,
    timeout = csp.timeout, timout = csp.timeout;

function fakeSearch(kind) {
  return function*(query) {
    yield timeout(Math.random() * 200);
    return kind  + " result for query " + query;
  };
}

var web = fakeSearch("web");
var image = fakeSearch("image");
var video = fakeSearch("video");

function* google(query) {
  var ch = chan();

  go(function*() {
    yield put(ch, (yield* web(query)));
  });
  go(function*() {
    yield put(ch, (yield* image(query)));
  });
  go(function*() {
    yield put(ch, (yield* video(query)));
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

"use strict";

// http://talks.golang.org/2012/concurrency.slide#46

// Run the Web, Image, and Video searches concurrently, and wait for
// all results.

var csp = require("../../src/csp"),
    go = csp.go, chan = csp.chan,
    put = csp.put, take = csp.take,
    timeout = csp.timeout;

// This example also shows how to compose generator functions with deep yields

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

  var results = [];
  for (var i = 0; i < 3; i++) {
    var result = yield take(ch);
    results.push(result);
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

var assert = require("chai").assert;
var buffers = require("../src/impl/buffers");

// TODO: Test peek

describe("Fixed buffer", function() {
  it("should work", function() {
    var b = buffers.fixed(2);
    assert.equal(b.count(), 0, "new buffer is empty");

    b.add("1");
    assert.equal(b.count(), 1);

    b.add("2");
    assert.equal(b.count(), 2);
    assert.equal(b.is_full(), true, "buffer is full");
    // assert.throw(function() {
    //   b.add("3");
    // }, Error, /full/);

    assert.equal(b.remove(), "1");
    assert.equal(b.is_full(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), "2");
    assert.equal(b.count(), 0);
    assert(buffers.EMPTY === b.remove(), "popping empty buffer gives EMPTY");
  });
});

describe("Dropping buffer", function() {
  it("should work", function() {
    var b = buffers.dropping(2);
    assert.equal(b.count(), 0, "new buffer is empty");

    b.add("1");
    assert.equal(b.count(), 1);

    b.add("2");
    assert.equal(b.count(), 2);
    assert.equal(b.is_full(), false, "dropping buffer is never full");
    assert.doesNotThrow(function() {
      b.add("3");
    }, "dropping buffer accepts always accept push");
    assert.equal(b.count(), 2);

    assert.equal(b.remove(), "1", "dropping buffer keeps old items");
    assert.equal(b.is_full(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), "2", "dropping buffer drops newest item");
    assert.equal(b.count(), 0);
    assert(buffers.EMPTY === b.remove(), "popping empty buffer gives EMPTY");
  });
});

describe("Sliding buffer", function() {
  it("should work", function() {
    var b = buffers.sliding(2);
    assert.equal(b.count(), 0, "new buffer is empty");

    b.add("1");
    assert.equal(b.count(), 1);

    b.add("2");
    assert.equal(b.count(), 2);
    assert.equal(b.is_full(), false, "sliding buffer is never full");
    assert.doesNotThrow(function() {
      b.add("3");
    }, "sliding buffer always accepts push");
    assert.equal(b.count(), 2);

    assert.equal(b.remove(), "2", "sliding buffer drops oldest item");
    assert.equal(b.is_full(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), "3", "sliding buffer keeps newest item");
    assert.equal(b.count(), 0);
    assert(buffers.EMPTY === b.remove(), "popping empty buffer gives EMPTY");
  });
});

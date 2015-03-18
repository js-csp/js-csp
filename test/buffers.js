var assert = require("chai").assert;
var buffers = require("../src/impl/buffers");

describe("Fixed buffer", function() {
  it("should work", function() {
    var b = buffers.fixed(2);
    assert.equal(b.count(), 0, "new buffer is empty");

    b.add("1");
    assert.equal(b.count(), 1);

    b.add("2");
    assert.equal(b.count(), 2);
    assert.equal(b.is_full(), true, "buffer is full");

    assert.equal(b.remove(), "1");
    assert.equal(b.is_full(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), "2");
    assert.equal(b.count(), 0);
    assert(buffers.EMPTY === b.remove(), "popping empty buffer gives EMPTY");
  });

  it("should allow overflowing", function() {
    var b = buffers.fixed(2);
    b.add("1");
    b.add("2");

    assert.equal(b.is_full(), true, "buffer is full");
    b.add("3");
    assert.equal(b.is_full(), true, "buffer is full (1 item overflowing)");
    b.add("4");
    assert.equal(b.is_full(), true, "buffer is full (2 items overflowing)");
    b.remove();
    b.remove();
    assert.equal(b.is_full(), true, "buffer is full (without overflowing)");
    b.remove();
    assert.equal(b.is_full(), false, "buffer is again not full");
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

describe("Promise buffer", function() {
  it("should work", function() {
    var b = buffers.promise();
    assert.equal(b.count(), 0, "new buffer is empty");
    assert.equal(b.remove(), buffers.EMPTY, "popping empty buffer gives EMPTY");

    b.add("1");
    assert.equal(b.count(), 1);

    b.add("2");
    assert.equal(b.count(), 1, "promise buffer drops puts after the first one");
    assert.equal(b.is_full(), false, "promise buffer is never full");
    assert.doesNotThrow(function() {
      b.add("3");
    }, "promise buffer always accepts push");
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), "1", "promise buffer always returns oldest item");
    assert.equal(b.is_full(), false);
    assert.equal(b.count(), 1);

    assert.equal(b.remove(), "1", "promise buffer keeps returning oldest item");
    assert.equal(b.is_full(), false);
    assert.equal(b.count(), 1);

    b.close();
    assert.equal(b.remove(), buffers.EMPTY, "promise buffer returns EMPTY after closing it");
  });
});

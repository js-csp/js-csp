"use strict";

var dispatch = require("./dispatch");
var channels = require("./channels");

// TODO: Test the skip list implementation (need to mock random number generation)
// TODO: Test timeout channels (need to mock scheduling functions)

// TODO: These should be configurable
var MAX_LEVEL = 15;
var PROBABILITY = 0.5;
var TIMEOUT_RESOLUTION = 10;    // milliseconds

// Note that a node's level is the decrement of its height (or its
// "forward" links' length). The same holds for the whole skip list.

function random_level() {
  var level = 0;
  while (Math.random() < PROBABILITY && level < MAX_LEVEL) {
    level += 1;
  }
  return level;
}
function SkipListNode(key, value, level) {
  this.key = key;
  this.value = value;
  // Create the array to store links to next nodes
  var n = level + 1;
  var forward = new Array(n);
  for (var i = 0; i < n; i++) {
    forward[i] = null;
  }
  this.forward = forward;
}

/**
 * Returns the forward-most node whose key is less than k. If an
 * "update" array is specified, populate it with the nodes visited.
 * These nodes will need to be updated when a new node is to be
 * inserted at k, or when the node at k is to be removed.
 */
function greatest_lesser_node(x, k, level, update) {
  for (; level >= 0; level--) {
    while (true) {
      var next = x.forward[level];
      if (!next || next.key >= k) {
        break;
      }
      x = next;
    }
    if (update) {
      update[level] = x;
    }
  }
  return x;
}

function SkipList() {
  this.head = new SkipListNode(null, null, 0);
  // TODO: Maybe we can use this.head.length - 1 instead (need to
  // remember to shrink this.head when removing item though)
  this.level = 0;
}

/**
 * Adds a node with the given key and value.
 */
SkipList.prototype.put = function(key, value) {
  var update = new Array(MAX_LEVEL + 1);
  var x = greatest_lesser_node(this.head, key, this.level, update).forward[0];
  // Found exact match, stop here
  if (x && x.key === key) {
    x.value = value;
    return;
  }
  // Create a new node with random height
  var new_level = random_level();
  x = new SkipListNode(key, value, new_level);
  // If this new node is higher than the list, we need to update its head
  // and height (level + 1)
  var i;
  if (new_level > this.level) {
    for (i = this.level + 1; i <= new_level; i++) {
      update[i] = this.head;
    }
    this.level = new_level;
  }
  // Insert the node, updating previous nodes that will be
  // "obstructed" by it
  for (i = 0; i <= new_level; i++) {
    x.forward[i] = update[i].forward[i];
    update[i].forward[i] = x;
  }
};

/**
 * Removes the node whose key is equal to the given key, if it exists.
 */
SkipList.prototype.remove = function(key) {
  var update = new Array(MAX_LEVEL + 1);
  var x = greatest_lesser_node(this.head, key, this.level, update).forward[0];
  if (x && x.key === key) {
    // Remove the node, updating previously "obstructed" nodes
    for (var i = 0; i <= this.level; i++) {
      var links = update[i].forward;
      if (links[i] === x) {
        links[i] = x.forward[i];
      }
    }
    // Update list's height
    for (; this.level > 0; this.level--) {
      if (this.head.forward[this.level]) {
        break;
      }
    }
  }
};

/**
 * Returns the node with the smallest key that is greater or equal to
 * the given key.
 */
SkipList.prototype.ceiling = function(key) {
  var x = this.head;
  for (var level = this.level; level >= 0; level--) {
    var next = x;
    while (true) {
      next = next.forward[level];
      if (!next || next.key >= key) {
        break;
      }
    }
    x = next ? next : x;
  }
  return x === this.head ? null : x;
};

// The shared collection of timeout channels. We use a skip list to
// avoid re-balancing a tree.
var timeouts = new SkipList();

/**
 * Returns a channel that will close after at least msecs
 * milliseconds. Multiple calls can returns the same channel,
 * subjected to a resolution of TIMEOUT_RESOLUTION milliseconds.
 */
exports.timeout = function timeout_channel(msecs) {
  var t = (new Date()).valueOf() + msecs;
  var existing = timeouts.ceiling(t);
  // If there's a channel that will time out not too late, return it.
  if (existing && existing.key < t + TIMEOUT_RESOLUTION) {
    return existing.value;
  }
  // Otherwise create and register a channel for sharing
  var chan = channels.chan();
  timeouts.put(t, chan);
  dispatch.queue_delay(function() {
    timeouts.remove(t);
    chan.close();
  }, msecs);
  return chan;
};

## Channels ##

Message passing between processes happens via channels. Channels can have many writers and readers,
which can do put and get operations on them putting or getting a single value at a time.

The following functions are *not* constructor functions. Don't use `new`.

### `chan(bufferOrN?, transducer?, exHandler?)` ###

Creates a channel with an optional buffer, an optional transducer, and optional exception handler. We'll
elaborate more on them later on.

If no argument is passed, the channel is unbuffered. This means that putters will "wait" for takers
and viceversa (synchronization).

We can put and take values asynchronously from a channel:
```javascript
var ch = csp.chan();

csp.takeAsync(ch, function(value) { return console.log("Got ", value); });

// After the put, the pending take will happen
csp.putAsync(ch, 42);
//=> "Got 42"
```

Puts and takes can happen in any order:
```javascript
var ch = csp.chan();

// Async puts accept a callback too
csp.putAsync(ch, 42, function(){ console.log("Just put 42"); });
csp.putAsync(ch, 43, function(){ console.log("One more"); });

csp.takeAsync(ch, function(value) { console.log("Got ", value); })
//=> "Got 42"
//=> "Just put 42"
csp.takeAsync(ch, function(value) { console.log("Got ", value); })
//=> "Got 43"
//=> "One more"
```

`bufferOrN`:
- If a number is passed, the channel is backed by a fixed buffer of that size (bounded asynchronization).
- If a buffer is passed, the channel is backed by that buffer (bounded asynchronization).

### `buffers.fixed(n)` ###

Creates a fixed buffer of size n. When full, puts will "block".

This is the default buffer that is created when calling `chan` with a number as its buffer argument.

### `buffers.dropping(n)` ###

Creates a dropping buffer of size n. When full, puts will not "block", but the value is discarded.
```javascript
var ch = csp.chan(csp.buffers.dropping(1));

csp.putAsync(ch, 42);
csp.putAsync(ch, 43); // will be dropped!

csp.takeAsync(ch, function(v) { console.log("Got ", v) });
//=> "Got 42"
csp.takeAsync(ch); // will "block"
```

### `buffers.sliding(n)` ###

Creates a sliding buffer of size n. When full, puts will not "block", but the oldest value is discarded.
```javascript
var ch = csp.chan(csp.buffers.sliding(1));

csp.putAsync(ch, 41);
csp.putAsync(ch, 42);

csp.takeAsync(ch, function(v) { console.log("Got ", v) });
//=> "Got 42"
csp.takeAsync(ch); // will "block"
```


### Transducers

If a [transducer](https://github.com/jlongster/transducers.js) is specified, the channel must be buffered. When an error is thrown during transformation, `exHandler` will be called with the error as the argument, and any non-`CLOSED` return value will be put into the channel. If `exHandler` is not specified, a default handler that logs the error and returns `CLOSED` will be used.
```javascript
var xducers = require("transducers.js");

// transducers execute from left to right when composed
var xform = xducers.compose(
          xducers.filter((v) => v !== 42),
          xducers.map((v) => v + 1)
    ),
    ch = csp.chan(2, xform);

csp.putAsync(ch, 42, function(){ console.log("Won't happen")});

csp.takeAsync(ch, function(value) { console.log("Got ", value)});
csp.putAsync(ch, 41, function(){ console.log("Just put 41")});
//=> "Got 42"
//=> "Just put 41"
```

### `timeout(msecs)` ###

Creates an unbuffered channel that will be closed after `msecs` milliseconds.

## Goroutines ##

### `go(f*, args?)` ###

Spawns a "goroutine" from the supplied generator function, and arguments.
Returns a channel that will receive the value returned by the goroutine.

The `yield` keyword can be used for doing take and put operations on a channel.
Yielding a channel is an implicit take.
```javascript
// Spawn a goroutine, and immediately return a channel
var ch = csp.go(function*(x) {
  yield csp.timeout(1000);
  return x;
}, [42]);
// Will "block" for 1 second then print 42;
console.log((yield csp.take(ch)));
```

`yield go` would start the goroutine "immediately" while `go` would not start it until the next `yield`, or `return`.

### `spawn(generator)` ###

Similar to `go`, but takes a generator instead of creating one.
```javascript
// Spawn a goroutine, and immediately return a channel
function* id(x) {
  yield csp.timeout(1000);
  return x;
}
var ch = csp.spawn(id(42));
// Will "block" for 1 second then print 42;
console.log((yield csp.take(ch)));
```

## Channel operations ##

Note that `put` and `take` operations must be prefixed with `yield`, and must be used inside goroutines, not normal functions. This makes sense, since these are (potentially) "blocking" operations.

### `yield put(ch, value)` ###

Puts a value into the channel. "Returns" `true` unless channel is already closed.
```javascript
var ch = csp.chan(1);
yield csp.put(ch, 42); // true
ch.close()
yield csp.put(ch, 43); // false
```

### `yield take(ch)` ###

Takes a value from the channel. "Returns" `csp.CLOSED` if channel is empty, and already closed.
```javascript
var ch = csp.chan(1);
yield csp.put(ch, 42);
yield csp.take(ch); // 42
ch.close()
yield csp.take(ch); // csp.CLOSED
```

### `offer(ch, value)` ###

Put a value in a channel iff it's possible to do so immediately. Returns `true` if channel received the value, `false` otherwise. Unlike `put`, `offer` cannot distinguish closed from ready channels.
```javascript
var ch = csp.chan(1);
csp.offer(ch, 42); // true
csp.offer(ch, 43); // false
```

### `poll(ch)` ###

Take a value from a channel iff it it's possible to do so immediately. Returns value if succesful, `NO_VALUE` otherwise. Unlike `take`, `poll` cannot distinguish closed from ready channels.
```javascript
var ch = csp.chan(1);
csp.poll(ch);      // csp.NO_VALUE
csp.offer(ch, 42); // true
csp.poll(ch);      // 42
```

### `yield alts(operations, options?)` ###

Completes at most one of the channel operations. Each operation is either a channel to be taken from, or a 2-element array of the form `[channel-to-put-into, value-to-put]`.
"Returns" an object with 2 properties: The `channel` of the succeeding operation, and the `value` returned by the corresponding `put`/`take` operation.
- If no operation is ready:
  + If `options.default` is specified, "returns" `{value: options.default, channel: csp.DEFAULT}`.
  + Otherwise blocks until an operation completes.
- If more than one operation is ready:
  + If `options.priority` is `true`, tries the operations in order.
  + Otherwise makes a non-deterministic choice.

Here's a simple example using a timeout channel for canceling an operation after a certain
amount of time:
```javascript
var ch = csp.chan();

csp.go(function*(){
    yield csp.timeout(1000);
    yield csp.put(ch, 42);
});

csp.go(function*(){
    var cancel = csp.timeout(300),
        result = yield csp.alts([ch, cancel]);
    console.log("Has been cancelled?", result.channel === cancel);
});
//=> "Has been cancelled? true"
```

### `yield sleep(msecs)` ###

This is deprecated. Use `yield timeout(msecs)` instead.

"Blocks" the current goroutine for `msecs` milliseconds.

### `ch.close()` ###

Close a channel.
- Pending and future takes "return" the buffered values, then `CLOSED`.
- Pending and future puts "return" `false`.

## Special values ##

- `csp.CLOSED`: Returned when taking from a closed channel. Cannot be put on a channel. Equal `null` for now.
- `csp.DEFAULT`: If an `alts` returns immediately when no operation is ready, the key `channel` of the result holds this value instead of a channel.
- `csp.NO_VALUE`: Returned when using `poll` on a channel that is either closed or has no values to take right away.

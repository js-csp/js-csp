## Channels ##

These are *not* constructor functions. Don't use `new`.

### `chan(bufferOrN?, transducer?, exHandler?)` ###

Creates a channel with an optional buffer, an optional transducer, and optional exception handler.

If no argument is passed, the channel is unbuffered (synchronization).

`bufferOrN`:
- If a number is passed, the channel is backed by a fixed buffer of that size (bounded asynchronization).
- If a buffer is passed, the channel is backed by that buffer (bounded asynchronization).

If a transducer is specified, the channel must be buffered. When an error is thrown during transformation, `exHandler` will be called with the error as the argument, and any non-`CLOSED` return value will be put into the channel. If `exHandler` is not specified, a default handler that logs the error and returns `CLOSED` will be used.

### `buffers.fixed(n)` ###

Creates a fixed buffer of size n. When full, puts will "block".

### `buffers.dropping(n)` ###

Creates a dropping buffer of size n. When full, puts will not "block", but the value is discarded.

### `buffers.sliding(n)` ###

Creates a sliding buffer of size n. When full, puts will not "block", but the oldest value is discarded.

### `timeout(msecs)` ###

Creates an unbuffered channel that will be closed after `msecs` milliseconds.

## Goroutines ##

### `go(f*, args?)` ###

Spawns a "goroutine" from the supplied generator function, and arguments.
Returns a channel that will receive the value returned by the goroutine.
```javascript
// Spawn a goroutine, and immediately return a channel
var ch = csp.go(function*(x) {
  yield csp.timeout(1000);
  return x;
}, [42]);
// Will "block" for 1 second then print 42;
console.log((yield csp.take(chan)));
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
console.log((yield csp.take(chan)));
```

## Channel operations ##

These operations (except for `close`) must be prefixed with `yield`, and must be used inside goroutines, not normal functions. This makes sense, since these are (potentially) "blocking" operations.

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
yield csp.put(ch, 42); // true
ch.close()
yield csp.put(ch, 43); // false
```

### `yield alts(operations, options?)` ###

Completes at most one of the channel operations. Each operation is either a channel to be taken from, or a 2-element array of the form `[channel-to-put-into, value-to-put]`.
"Returns" an object with 2 properties: The `channel` of the succeeding operation, and the `value` returned by the corresponding `put`/`take` operation.
- If no operation is ready:
  + If `options.default` is specified, "returns" `{value: options.default, channel: csp.DEFAULT}`.
  + Otherwise blocks until the an operation completes.
- If more than one operation is ready:
  + If `options.priority` is `true`, tries the operations in order.
  + Otherwise makes a non-deterministic choice.

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

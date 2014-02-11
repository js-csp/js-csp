# js-csp
Communicating sequential processes for Javascript (like Clojurescript core.async, or Go).

**WARNING: This is currently alpha  software.**

## Examples ##
```javascript
var csp = require("js-csp");
```

Pingpong (ported from [Go](http://talks.golang.org/2013/advconc.slide#6)).
```javascript
function* player(name, table) {
  while (true) {
    var ball = yield csp.take(table);
    if (ball === null) {
      console.log(name + ": table's gone");
      return;
    }
    ball.hits += 1;
    console.log(name + " " + ball.hits);
    yield csp.wait(100);
    yield csp.put(table, ball);
  }
}

csp.go(function* () {
  var table = csp.chan();

  csp.go(player, ["ping", table]);
  csp.go(player, ["pong", table]);

  yield csp.put(table, {hits: 0});
  yield csp.wait(1000);
  table.close();
});
```

[More examples](examples/).

## Supported runtimes ##
js-csp requires ES6 generators

#### Firefox >= 27 ####

Earlier versions of Firefox either had ES6 generators turned off, or supported old style generators.

#### Node.JS >= 0.11.6 ####

Run with `--harmony` or `--harmony-generators` flag.
Check support using
```bash
node --v8-options | grep harmony
```

#### Chrome with experimental flag turned on ####

Look for "Enable Experimental JavaScript" at [chrome://flags](chrome://flags).

#### Other ####

Use one of the js-to-js compilers:
- [Facebook Regenerator](http://facebook.github.io/regenerator/).
- [Google Traceur](https://github.com/google/traceur-compiler).

Or, if you use Python's Twisted:
https://github.com/ubolonton/twisted-csp

Or, if you want a better language:
https://github.com/clojure/core.async

## API ##

This is an almost exact clone of Clojurescript's `core.async`. The most significant difference is that the IOC logic is encapsulated using generators (`yield`) instead of macros.

### Channels ###

These are *not* constructor functions. Don't use `new`.

##### `chan([bufferOrNumber])` #####

Creates a channel.
- If a number is passed, the channel is backed by a fixed buffer of that size (bounded asynchronization).
- If a buffer is passed, the channel is backed by that buffer (bounded asynchronization).
- If no argument is passed, the channel is unbuffered (synchronization).

##### `buffers.fixed(n)` #####

Creates a fixed buffer of size n. When full, puts will block.
TODO: When to use (e.g. backpressure)

##### `buffers.dropping(n)` #####

Creates a dropping buffer of size n. When full, puts will not block, but the value is discarded.
TODO: When to use (stop responding to fast stuff)

##### `buffers.sliding(n)` #####

Creates a sliding buffer of size n. When full, puts will not block, but the oldest value is discarded.
TODO: When to use (uninteresting stale values)

### Goroutines ###

##### `go(f* [, args [, returnChannel]])` #####

Spawns a "goroutine" from the supplied generator function, and arguments.
If `returnChannel` is `true`, returns a channel with that will receive the value returned by the goroutine. Returns `null` if `returnChannel` is omitted.
**Note**: Do not return `null` from the channel.
```javascript
// Spawn a goroutine, and immediately return a channel
var ch = csp.go(function*(x) {
  yield csp.wait(1000);
  return x;
}, [42], true);
// Will "block" for 1 second then print 42;
console.log((yield csp.take(chan)));
```

##### `spawn(generator [, returnChannel])` #####

Similar to `go`, but takes a generator instead of creating one.
```javascript
// Spawn a goroutine, and immediately return a channel
function* id(x) {
  yield csp.wait(1000);
  return x;
}
var ch = csp.spawn(id(42), true);
// Will "block" for 1 second then print 42;
console.log((yield csp.take(chan)));
```

### Channel operations ###

These operations (except for `close`) must be prefixed with `yield`, and must be used inside goroutines, not normal functions. This makes sense, since these are (potentially) "blocking" operations.

##### `yield put(ch, value)` #####

Puts a value into the channel. "Returns" `true` unless channel is already closed.

##### `yield take(ch)` #####

Takes a value from the channel. "Returns" `null` if channel is already closed.

##### `yield alts(operations [, options])` #####

Completes at most one of the channel operations. Each operation is either a channel to be taken from, or a 2-element array of the form `[channel-to-put-into, value-to-put]`.
"Returns" an object with 2 properties: The `channel` of the succeeding operation, and the `value` returned by the corresponding `put`/`take` operation.
- If no operation is ready:
  + If `options.default` is specified, "returns" `{value: options.default, channel: csp.DEFAULT}`.
  + Otherwise block until the an operation completes.
- If more than one operation is ready:
  + If `options.priority` is `true`, tries the operations in order.
  + Otherwise makes a non-deterministic choice.

##### `yield wait(msecs)` #####

"Blocks" the current goroutine for `msecs` milliseconds.

##### `ch.close()` #####
Close a channel.
- Pending and future takes "return" the buffered values, then `null`.
- Pending and future puts "return" `false`.

### Other types of endpoint ###
TODO

#### Multiplexers ####

#### Mixers ####

#### Publishers ####

### Composition operations ###
TODO

## TODO ##

- Feature parity with Clojurescript's `core.async`.
- More documentation and examples.
- Browser builds and tests.
- Conversion functions that "de-IOC" promises and callback-based APIs.

## Inspiration ##

- http://swannodette.github.io/2013/08/24/es6-generators-and-csp
- https://github.com/clojure/core.async
- https://github.com/olahol/node-csp

## License ##

Distributed under [Eclipese Public License](http://opensource.org/licenses/EPL-1.0).

These functions are exposed through the `csp.operations` namespace.

## Conversion ##

`js-csp` offers several convenience functions for working with channels and collections. Here they are:

### `onto(ch, coll, keepOpen?)` ###
Puts values from the supplied array `coll` into the channel `ch`, closing it when done, unless `keepOpen` is `true`.

```javascript
var ch = csp.chan(),
    coll = [0, 1, 2];

// Notice that we're keeping the channel open
csp.operations.onto(ch, coll, true);

go(function*(){
    var value = yield ch;
    while (value !== csp.CLOSED) {
        console.log("Got ", value);
        console.log("Waiting for a value");
        value = yield ch;
    }
    console.log("Channel closed!");
});
//=> "Got 0"
//=> "Waiting for a value"
//=> "Got 1"
//=> "Waiting for a value"
//=> "Got 2"
//=> "Waiting for a value"
```

### `fromColl(coll)` ###
Returns a channel that contains the values from the supplied array `coll`. It is closed after the last value is delivered.

```javascript
var coll = [0, 1, 2],
    ch = csp.operations.fromColl(coll);

go(function*(){
    var value = yield ch;
    while (value !== csp.CLOSED) {
        console.log("Got ", value);
        console.log("Waiting for a value");
        value = yield ch;
    }
    console.log("Channel closed!");
});
//=> "Got 0"
//=> "Waiting for a value"
//=> "Got 1"
//=> "Waiting for a value"
//=> "Got 2"
//=> "Channel closed!"
```

### `reduce(f, init, ch)` ###
Returns a channel that contains a single value obtained by reducing `f` over all the values from the source channel `ch` with `init` as the starting value. The source channel must close for the new channel to deliver the value, after which it is closed. If the source channel closes without producing a value, `init` is put into the new channel.

```javascript
var ch = csp.chan(),
    append = function(a, b) { return a + " " + b; };

var reduceCh = csp.operations.reduce(append, "Hello", ch);

csp.go(function*(){
    yield csp.put(ch, "CSP");
    yield csp.put(ch, "World");
    console.log(yield reduceCh);
});

ch.close();
//=> "Hello CSP World"
```

### `into(coll, ch)` ###
Returns a channel that contains a single array of values taken from `ch` appended to values from the supplied array `coll`. The source channel must close for the new channel to deliver the value, after which it is closed. If the source channel closes without producing a value, a copy of `coll` is put into the new channel.

```javascript
var ch = csp.chan(),
    baseColl = [0, 1, 2];

var intoCh = csp.operations.into(baseColl, ch);

csp.go(function*(){
    yield csp.put(ch, 3);
    yield csp.put(ch, 4);
    console.log(yield intoCh);
});

ch.close();
//=> [0, 1, 2, 3, 4]
```

## Flow Control ##

### `pipe(in, out, keepOpen?)` ###
Supplies the target channel `out` with values taken from the source channel `in`. The target channel is closed when the source channel closes, unless `keepOpen` is `true`. Returns the target channel.

```javascript
var inCh = csp.chan(),
    outCh = csp.chan();

// Notice that we're keeping `outCh` open after `inCh` is closed
csp.operations.pipe(inCh, outCh, true);

csp.go(function*(){
    var value = yield outCh;
    while (value !== csp.CLOSED) {
        console.log("Got ", value);
        console.log("Waiting for a value");
        value = yield outCh;
    }
    console.log("Channel closed!");
});

csp.putAsync(inCh, 0);
//=> "Got 0"
//=> "Waiting for a value"
csp.putAsync(inCh, 1);
//=> "Got 1"
//=> "Waiting for a value"
inCh.close();
```

### `split(p, ch, trueBufferOrN?, falseBufferOrN?)` ###
Returns an array of 2 channel. The first contains value from the source channel `ch` that satisfy the predicate `p`. The second contains the other values. The new channels are unbuffered, unless `trueBufferOrN`/`falseBufferOrN` are specified, Both channels are closed when the source channel closes.

```javascript
var isEven = function(x) { return x % 2 === 0; },
    ch = csp.chan();

var chans = csp.operations.split(isEven, ch),
    evenChan = chans[0],
    oddChan = chans[1];

csp.go(function*(){
    var value = yield evenChan;
    while (value !== csp.CLOSED) {
        console.log("Even! ", value);
        value = yield evenChan;
    };
});
csp.go(function*(){
    var value = yield oddChan;
    while (value !== csp.CLOSED) {
        console.log("Odd! ", value);
        value = yield oddChan;
    };
});

csp.operations.onto(ch, [1, 2, 3, 4]);
//=> "Odd! 1"
//=> "Even! 2"
//=> "Odd! 3"
//=> "Even! 4"
```

### `merge(chs, bufferOrN?)` ###
Returns a channel that contains values from all the source channels `chs`. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when all the source channels have closed.

```javascript
var aCh = csp.chan(),
    anotherCh = csp.chan(),
    mergedCh = csp.operations.merge([aCh, anotherCh]);

csp.go(function*(){
    var value = yield mergedCh;
    while (value !== csp.CLOSED) {
        console.log("Got ", value);
        value = yield mergedCh;
    };
});

csp.putAsync(aCh, 0);
//=> "Got 0"
csp.putAsync(anotherCh, 1);
//=> "Got 1"
csp.putAsync(aCh, 2);
//=> "Got 2"
csp.putAsync(anotherCh, 3);
//=> "Got 3"
```

### `pipeline(to, xf, from, keepOpen?, exHandler?)` ###
Moves values from channel `from` to channel `to`, transforming them with the transducer `xf`. When an error is thrown during transformation, `exHandler` will be called with the error as the argument, and any non-`CLOSED` return value will be put into the `to` channel. If `exHandler` is not specified, a default handler that logs the error and returns `CLOSED` will be used. If `keepOpen?` is falsey, the `to` channel is closed when the `from` channel closes.

```javascript
var xducers = require("transducers.js");

var fromCh = csp.chan(),
    toCh = csp.chan(),
    double = function(x) { return x * 2; }
    xform = xducers.map(double);

// Notice that we're keeping `toCh` open after `fromCh` is closed
csp.operations.pipeline(toCh, xform, fromCh, true);

csp.go(function*(){
    var value = yield toCh;
    while (value !== csp.CLOSED) {
        console.log("Got ", value);
        console.log("Waiting for a value");
        value = yield toCh;
    }
    console.log("Channel closed!");
});

csp.putAsync(fromCh, 1);
//=> "Got 2"
//=> "Waiting for a value"
csp.putAsync(fromCh, 2);
//=> "Got 4"
//=> "Waiting for a value"
```

### `pipelineAsync(n, to, af, from, keepOpen?)` ###
Moves values from channel `from` to channel `to`, using the asynchronous operation `af(value, channel)`. `af` should put a return value into the provided channel when done, and close it. At most `n` operations will be run at a time. If `keepOpen?` is falsey, the `to` channel is closed when the `from` channel closes.


```javascript
var toCh = csp.chan(),
    fromCh = csp.chan();

function waitAndPut(value, ch) {
    setTimeout(function(){
        csp.putAsync(ch, value);
        ch.close();
    },
    value);
};

// Notice that we're keeping `toCh` open after `fromCh` is closed
csp.operations.pipelineAsync(3, toCh, waitAndPut, fromCh, true);

csp.go(function*(){
    var value = yield toCh;
    while (value !== csp.CLOSED) {
        console.log("Got ", value);
        value = yield toCh;
    };
});

csp.putAsync(fromCh, 3000);
csp.putAsync(fromCh, 2000);
csp.putAsync(fromCh, 1000);
//=> "Got 1000"
//=> "Got 2000"
//=> "Got 3000"
```

## High-level abstractions ##

Channels and processes are a great substrate for async computation. However, `js-csp` offers several higher-level abstractions on top of them.

### Mult ###

When we have a channel whose values have to be broadcasted to many others, we can use `mult(ch)` for creating a mult(iple) of the supplied channel.
Once we have the mult, we can attach channels to it using `mult.tap(m, ch, keepOpen?)` and detach them using `mult.untap(m, ch)`. Mults also support removing
all tapped channels with `mult.untapAll(m)`.

Every item put in the source channel is distributed to all taps, and all of them must accept it before the next item is distributed. For preventing slow
takers from holding the mult, buffering should be used judiciously.

Closed tapped channels are removed automatically from the mult.

```javascript
var sourceCh = csp.chan(),
    mult = csp.operations.mult(sourceCh);

// Let's create a couple of channels to tap to `mult`, notice that puts to `anotherCh` will "block" if there aren't any takers
// because of it not being buffered
var aCh = csp.chan(),
    anotherCh = csp.chan(0);

csp.go(function*(){
    var value = yield aCh;
    while (value !== csp.CLOSED) {
        console.log("Got ", value, " in `aCh`");
        value = yield aCh;
    }
});
csp.go(function*(){
    var value = yield anotherCh;
    while (value !== csp.CLOSED) {
        console.log("Got ", value, " in `anotherCh`");
        console.log("Resting for 3 seconds");
        yield csp.timeout(3000);
        value = yield anotherCh;
    }
});

// From this point on, values put into `sourceCh` will be broadcasted to `aCh` and `anotherCh`
csp.operations.mult.tap(mult, aCh);
csp.operations.mult.tap(mult, anotherCh);

// Notice how values are only delivered when all the takers can receive them
csp.putAsync(sourceCh, 1);
csp.putAsync(sourceCh, 2);
//=> "Got 1 in `aCh`"
//=> "Got 1 in `anotherCh`"
//=> "Resting for 3 seconds"
//=> "Got 2 in `aCh`"
//=> "Got 2 in `anotherCh`"
//=> "Resting for 3 seconds"
```

### Pub-sub ###

One could easily build a pub-sub abstraction on top of mults and taps but `js-csp` already implements it since it's a widely
used communication mechanism. Instead of creating a mult from a source channel, we create a pub(lication) with `pub(ch, topicFn, bufferFn)`.
The `topicFn` will be used to extract the "topic" of the values that are put in the source channel, and other channels can subscribe to
the topics they are interested in with `pub.sub(p, topic, ch, keepOpen?)`.

`pub.unsub(p, topic, ch)` allows us to unsubscribe channels from the given topic and `pub.unsubAll(p, topic)` to unsubscribes all channels from
the given topic.

```javascript
var sourceCh = csp.chan(),
    extractTopic = function(v) { return v.action; },
    publication = csp.operations.pub(sourceCh, extractTopic);

var ACTIONS = {
    INC: "increment",
    DOUBLE: "double"
}

// This channel will be used for logging published values
var logCh = csp.chan();

csp.operations.pub.sub(publication, ACTIONS.INC, logCh);
csp.operations.pub.sub(publication, ACTIONS.DOUBLE, logCh);

csp.go(function*(){
    var value = yield logCh;
    while (value !== csp.CLOSED) {
        console.log("LOG: ", value);
        value = yield logCh;
    }
});


// This channel will receive the "increment" values
var incCh = csp.chan();

csp.operations.pub.sub(publication, ACTIONS.INC, incCh);

csp.go(function*(){
    var value = yield incCh;
    while (value !== csp.CLOSED) {
        console.log("INCREMENT: ", value.payload + 1);
        value = yield incCh;
    }
});

// This channel will receive the "double" values
var doubleCh = csp.chan();

csp.operations.pub.sub(publication, ACTIONS.DOUBLE, doubleCh);

csp.go(function*(){
    var value = yield doubleCh;
    while (value !== csp.CLOSED) {
        console.log("DOUBLE: ", value.payload * 2);
        value = yield doubleCh;
    }
});

// Notice how different channels receive only the values they are interested in
csp.putAsync(sourceCh, { action: ACTIONS.INC, payload: 41 });
//=> "LOG: { action: 'increment', payload: 41 }"
//=> "INC: 42""
csp.putAsync(sourceCh, { action: ACTIONS.DOUBLE, payload: 21 });
//=> "LOG: { action: 'double', payload: 21 }"
//=> "DOUBLE: 42""
```

### Mix ###

As we learned, we can use the `merge` operation for piping the values put in multiple channels into a merged channel. This is great but there are situations in which
we want to combine multiple channels into one with a fine-grained control over input channels. `js-csp` gives us the mix(er) abstraction, which allows us to control
input channel's behaviour with respect to the output channel.

We can create a mix(er) given the output channel with `mix(ch)`. Once we have a mixer we can add input channels into the mix using `mix.add(m, ch)`, remove them with `mix.remove(m, ch)`
and remove every input channel with `mix.removeAll(m)`.

The interesting part of the mixer is that we can mute, pause and listen exclusively to certain input channels:

- Muting an input channel means that values will still be taken from it but they will not be forwarded to the output channel,
  thus being discarded.
- Pausing an input channel means that no values will be taken from it.
- Soloing one or more input channels will cause the output channel to only receive the values from those channels. We can also
  control the non-soloed channel behaviour with `mix.setSoloMode(m, mode)`, where `mode` can be either `mix.MUTE` or `mix.PAUSE`.
  By default, non-soloed channels are muted.

The states of the channels is controlled using `mix.toogle(m, updateStateList)`, where `updateStateList` is a list of [channel, state]
pairs.

```javascript
var outCh = csp.chan(),
    mix = csp.operations.mix(outCh);

var inChan1 = csp.chan(),
    inChan2 = csp.chan(),
    inChan3 = csp.chan();

csp.operations.mix.add(mix, inChan1);
csp.operations.mix.add(mix, inChan2);
csp.operations.mix.add(mix, inChan3);

// Let's listen to values that `outCh` receives
csp.go(function*(){
    var value = yield outCh;
    while (value !== csp.CLOSED) {
        console.log("Got ", value);
        value = yield outCh;
    }
});

// By default, every value put in the input channels will come out in `outCh`
csp.putAsync(inChan1, 1);
//=> "Got 1"
csp.putAsync(inChan2, 2);
//=> "Got 2"
csp.putAsync(inChan3, 3);
//=> "Got 3"

// Let's pause `inChan2` and see what happens
csp.operations.mix.toggle(mix, [[inChan2, { pause: true }]]);

csp.putAsync(inChan1, 1);
//=> "Got 1"
csp.putAsync(inChan2, 2); // `outCh` won't receive this value (yet)
csp.putAsync(inChan3, 3);
//=> "Got 3"

csp.operations.mix.toggle(mix, [[inChan2, { pause: false }]]);
//=> "Got 2"

// Let's see how muting `inChan2` discards the values put into it
csp.operations.mix.toggle(mix, [[inChan2, { mute: true }]]);

csp.putAsync(inChan1, 1);
//=> "Got 1"
csp.putAsync(inChan2, 2); // `outCh` will never receive this value
csp.putAsync(inChan3, 3);
//=> "Got 3"

csp.operations.mix.toggle(mix, [[inChan2, { mute: false }]]);

// Let's see how solo-ing channels implies (by default) muting the rest
csp.operations.mix.toggle(mix, [[inChan1, { solo: true }], [inChan2, { solo: true }]]);

csp.putAsync(inChan1, 1);
//=> "Got 1"
csp.putAsync(inChan2, 2);
//=> "Got 2"
csp.putAsync(inChan3, 3); // `outCh` will never receive this value

csp.operations.mix.toggle(mix, [[inChan1, { solo: false }], [inChan2, { solo: false }]]);

// Let's see how we can configure the state of non-soloed channels to pause instead of mute
csp.operations.mix.setSoloMode(mix, csp.operations.mix.PAUSE);
csp.operations.mix.toggle(mix, [[inChan1, { solo: true }]]);

csp.putAsync(inChan1, 1);
//=> "Got 1"
csp.putAsync(inChan2, 2); // `outCh` won't receive this value (yet)
csp.putAsync(inChan3, 3); // `outCh` won't receive this value (yet)

csp.operations.mix.toggle(mix, [[inChan1, { solo: false }]]);
//=> "Got 2"
//=> "Got 3"
```

## Transforming ##

The functions listed in this section are deprecated.

Use [transducers](https://github.com/jlongster/transducers.js) instead, they are context-independent and don't incur the overhead of
creating intermediary channels for every transformation. In the examples below, we'll see transudcer counterparts of the deprecated
functions.

Note that creating channels with transducers requires us to specify either a buffer size or a buffer instance.

### Mapping ###

We can transform the values put into a channel creating it with a mapping transducer. All the values put on the channel will be transformed with the
mapping function and takers will receive the transformed value.

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var inc = function(x) { return x + 1; },
    ch = csp.chan(1, xducers.map(inc));

csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 41);
//=> "Got 42"
```

#### `map(f, chs, bufferOrN?)` ####
Returns a channel that contains the values obtained by applying `f` to each round of values taken from the source channels `chs`. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when any of the source channels closes.

#### `mapFrom(f, ch)` ####
Returns a channel that contains values produced by applying `f` to each value taken from the source channel `ch`.

#### `mapInto(f, ch)` ####
Returns a channel that applies `f` to each received value before putting it into the target channel `ch`. When the channel is closed, it closes the target channel.

### Filtering ###

We can filter the values put into a channel creating it with a filtering transducer. The values will be put in the channel only if they return `true` when testing them
with the predicate.

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var isEven = function(x) { return x % 2 === 0; },
    ch = csp.chan(1, xducers.filter(isEven));

csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 41); // this value will not be put into the channel
csp.putAsync(ch, 42);
//=> "Got 42"
```

#### `filterFrom(p, ch, bufferOrN?)` ####
Returns a channel that contains values from the source channel `ch` satisfying the predicate `p`. Other values will be discarded. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel is closes.

#### `filterInto(p, ch)` ####
Returns a channel that puts received values satisfying predicate `p` into the target channel `ch`, discarding the rest. When it is closed, it closes the target channel.

### Removing ###

Removing is the opposite of filtering, we can remove the values put into a channel creating it with a removing transducer. The values will not be put in the channel if they
return `true` when testing them with the predicate.

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var isEven = function(x) { return x % 2 === 0; },
    ch = csp.chan(1, xducers.remove(isEven));

csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 42); // this value will not be put into the channel
csp.putAsync(ch, 43);
//=> "Got 43"
```

#### `removeFrom(p, ch, bufferOrN?)` ####
Like `filterFrom`, but keeps the the values not satisfying the predicate.

#### `removeInto(p, ch)` ####
Like `filterInt`, but keeps the the values not satisfying the predicate.

### Flattening ###

Sometimes we have a function that, given a value, returns an array of results. If we want each of the values of the result array to be flattened and
put in the channel one by one, we can use the mapcatting transducer. mapcat stands for "map and concat".

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var dupe = function(x) { return [x, x]; },
    ch = csp.chan(1, xducers.mapcat(dupe));

csp.takeAsync(ch, function(v) { console.log("Got", v); });
csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 42);
//=> "Got 42"
//=> "Got 42"
```

#### `mapcatFrom(f, ch, bufferOrN?)` ####
Returns a channel that contains values from arrays, each of which is obtained by applying `f` to each value the source channel `ch`. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel closes

#### `mapcatInto(f, ch, bufferOrN?)` ####
Returns a channel that applies `f` to each received value to get an array, then puts each value from that array into the target channel `ch`. The new channel is unbuffered, unless `bufferOrN` is specified. When it is closed, it closes the target channel.

### Taking ###

If we want to limit the number of values that can be put into a channel we can use a taking transducer. After we have put the amount of values that the taking
transducer will accept, the channel will be closed.

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var ch = csp.chan(1, xducers.take(1));

csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 42);
//=> "Got 42"

console.log(ch.closed);
//=> true
```

#### `take(n, ch, bufferOrN?)` ####
Returns a channel that contains at most `n` values from the source channel `ch`. It is closed when `n` values have been delivered, or when the source channel closes. The new channel is unbuffered, unless `bufferOrN` is specified.

### Avoiding consecutive duplicates ###

If we want to avoid consecutive duplicate values in a channel we can use a deduping transducer. If we try to put the same value more than once only the first value will
be really put in the channel.

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var ch = csp.chan(1, xducers.dedupe());

csp.takeAsync(ch, function(v) { console.log("Got", v); });
csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 42);
//=> "Got 42"

csp.putAsync(ch, 42);
csp.putAsync(ch, 42);
csp.putAsync(ch, 42);

csp.putAsync(ch, 43);
//=> "Got 43"
```

#### `unique(ch, bufferOrN?)` ####
Returns a channel that contains values from the source channel `ch`, dropping consecutive duplicates. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel closes.

### Partitioning ###

If we want to partition the values put in a channel in chunks of `n` elements, we can create a channel with a partitioning transducer. The takers will not receive values
until `n` values have been put into the channel. When `n` values have been put, a taker will receive an array with such elements. If less than `n` values have been put
and the channel is closed, a pending take will receive an array of the elements put so far.

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var ch = csp.chan(1, xducers.partition(2));

csp.takeAsync(ch, function(v) { console.log("Got", v); });
csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 0);
csp.putAsync(ch, 1);
//=> "Got [0, 1]"

csp.putAsync(ch, 2);
ch.close();
//=> "Got [2]"
```

If we want to partition sequences of values that return `true` for a certain predicate and those who return `false`, we can create a channel with a `partitionBy` transducer. Whenever the
values we put into a channel go from returning `true` to `false`, a take will receive the previous values that returned `true` in an array. The same is true when going from `false` to `true`. As with the previous example, if we close the channel a take will receive the elements put so far.

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var isEven = function(x) { return x % 2 === 0; },
    ch = csp.chan(1, xducers.partitionBy(isEven));

csp.takeAsync(ch, function(v) { console.log("Got", v); });
csp.takeAsync(ch, function(v) { console.log("Got", v); });
csp.takeAsync(ch, function(v) { console.log("Got", v); });

// Evens
csp.putAsync(ch, 2);
csp.putAsync(ch, 4);

// Odds
csp.putAsync(ch, 5);
//=> "Got [2, 4]"
csp.putAsync(ch, 7);

// Evens again
csp.putAsync(ch, 8);
//=> "Got [5, 7]"

ch.close();
//=> "Got [8]"
```

#### `partition(n, ch, bufferOrN?)` ####
Returns a channel that contains values from the source channel `ch` grouped into arrays of size `n`. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel closes. The last array's length is less than `n` if there are not enough values from the source channel.

#### `partitionBy(f, ch, bufferOrN?)` ####
Returns a channel that contains values from the source channel `ch` grouped into arrays of consecutive duplicates. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel closes.

### Composing transformations ###

Transducers by themselves are very powerful and allow us to transform the values put into a channel in interesting ways. One great property of transducers
is that they can be composed into another transducer to create more complex transformations. Let's see an example of transducer composition:

```javascript
var csp = require("js-csp"),
    xducers = require("transucers.js");

var inc = function(x) { return x + 1; },
    isEven = function(x) { return x % 2 === 0; },
    xform = xducers.compose(
        xducers.map(inc),
        xducers.filter(isEven),
        xducers.take(2)
    ),
    ch = csp.chan(1, xform);

csp.takeAsync(ch, function(v) { console.log("Got", v); });
csp.takeAsync(ch, function(v) { console.log("Got", v); });

csp.putAsync(ch, 2);
csp.putAsync(ch, 5);
//=> "Got 6"
csp.putAsync(ch, 8);
csp.putAsync(ch, 11);
//=> "Got 12"

console.log(ch.closed);
//=> true
```

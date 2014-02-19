TODO: Document all operations
TODO: Maybe it should be "items" not "values" (js is mutable)

### Composition operations ###
These functions are exposed through `csp.operations`.

##### `mapFrom(f, ch)` #####
Returns a channel that contains values produced by applying `f` to each value taken from the source channel `ch`.

##### `mapInto(f, ch)` #####
Returns a channel that applies `f` to each received value before putting it into the target channel `ch`. When the channel is closed, it closes the target channel.

##### `filterFrom(p, ch [, bufferOrN])` #####
Returns a channel that contains values from the source channel `ch` satisfying the predicate `p`. Other values will be discarded. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel is closes.

##### `filterInto(p, ch)` #####
Returns a channel that puts received values satisfying predicate `p` into the target channel `ch`, discarding the rest. When it is closed, it closes the target channel.

##### `removeFrom(p, ch [, bufferOrN])` #####
Like `filterFrom`, but keeps the the values not satisfying the predicate.

##### `removeInto(p, ch)` #####
Like `filterInt`, but keeps the the values not satisfying the predicate.

##### `mapcatFrom(f, ch, [, bufferOrN])` #####
Returns a channel that contains values from arrays, each of which is obtained by applying `f` to each value the source channel `ch`. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel closes

##### `mapcatInto(f, ch, [, bufferOrN])` #####
Returns a channel that applies `f` to each received value to get an array, then puts each value from that array into the target channel `ch`. The new channel is unbuffered, unless `bufferOrN` is specified. When it is closed, it closes the target channel.

##### `pipe(in, out [, keepOpen])` #####
Supplies the target channel `out` with values taken from the source channel `in`. The target channel is closed when the source channel closes, unless `keepOpen` is `true`. Returns the target channel.

##### `split(p, ch [, trueBufferOrN [, falseBufferOrN]])` #####
Returns an array of 2 channel. The first contains value from the source channel `ch` that satisfy the predicate `p`. The second contains the other values. The new channels are unbuffered, unless `trueBufferOrN`/`falseBufferOrN` are specified, Both channels are closed when the source channel closes.

##### `reduce(f, init, ch)` #####
Returns a channel that contains a single value obtained by reducing `f` over all the values from the source channel `ch` with `init` as the starting value. The source channel must close for the new channel to deliver the value, after which it is closed. If the source channel closes without producing a value, `init` is put into the new channel.

##### `onto(ch, coll [, keepOpen])` #####
Puts values from the supplied array `coll` into the channel `ch`, closing it when done, unless `keepOpen` is `true`.

##### `fromColl(coll)` #####
Returns a channel that contains the values from the supplied array `coll`. It is closed after the last value is delivered.

##### `map(f, chs [, bufferOrN])` #####
Returns a channel that contains the values obtained by applying `f` to each round of values taken from the source channels `chs`. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when any of the source channels closes.

##### `merge(chs [, bufferOrN])` #####
Returns a channel that contains values from all the source channels `chs`. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when all the source channels have closed.

##### `into(coll, ch)` #####
Returns a channel that contains a single array of values taken from `ch` appended to values from the supplied array `coll`. The source channel must close for the new channel to deliver the value, after which it is closed. If the source channel closes without producing a value, a copy of `coll` is put into the new channel.

##### `take(n, ch [, bufferOrN])` #####
Returns a channel that contains at most `n` values from the source channel `ch`. It is closed when `n` values have been delivered, or when the source channel closes. The new channel is unbuffered, unless `bufferOrN` is specified.

##### `unique(ch [, bufferOrN])` #####
Returns a channel that contains values from the source channels `ch`, dropping consecutive duplicates. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel closes.

##### `partitionBy(f, ch [, bufferOrN])` #####
Returns a channel that contains values from the source channels grouped into arrays of consecutive duplicates. The new channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel closes.

### Multiplexing ###

TODO

### Mixing ###

TODO

### Publishing ###

TODO

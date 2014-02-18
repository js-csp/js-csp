TODO: Document all operations

### Composition operations ###
These functions are exposed through `csp.operations`.

##### `mapFrom(f, ch)` #####
Returns a channel that contains values produced by applying `f` to each value taken from the source channel `ch`.

##### `mapInto(f, ch)` #####
Returns a channel that applies `f` to each received value before putting it on the target channel `ch`. When the channel is closed, it closes the target channel.

##### `filterFrom(p, ch [, bufferOrN])` #####
Returns a channel that contains values from the source channel `ch` satisfying the predicate `p`. Other values will be discarded. The channel is unbuffered, unless `bufferOrN` is specified. It is closed when the source channel is closed.

##### `filterInto(p, ch)` #####
Returns a channel that puts received values satisfying predicate `p` into the target channel `ch`, discarding the rest. When it is closed, it closes the target channel.

##### `removeFrom(p, ch [, bufferOrN])` #####
Like `filterFrom`, but keeps the the values not satisfying the predicate.

##### `removeInto(p, ch)` #####
Like `filterInt`, but keeps the the values not satisfying the predicate.

### Multiplexing ###

TODO

### Mixing ###

TODO

### Publishing ###

TODO

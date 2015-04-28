# Changes to js-csp

## 0.4.1

- FIXED: When a take is fulfilled by a waiting put, it now correctly invalidates other operations belonging to the same `alts`.

## 0.4.0

- CHANGED: Official [transducer protocol](https://github.com/cognitect-labs/transducers-js/issues/20) is now supported, instead of the old protocol.

## 0.3.4
- ADDED: Single-write multi-read behavior is now supported via promise buffers and promise channels.

## 0.3.3
- ADDED: Pipelining functions `pipeline` and `pipelineAsync`.
- FIXED: `mix` now properly handles solos and mutes.

## 0.3.2
- FIXED: Incorrect handling of multiple pending puts/takes is now fixed.
- ADDED: Each goroutine now keeps a reference to its generator function, for debugging purpose.

## 0.3.1
- FIXED: `alts`' at-most-once guarantee is no longer violated when there is an operation that:
  + Attempts to put on a closed channel.
  + Is registered after other not-ready-yet operations, causing one of these operation to be fulfilled as well.

## 0.3.0
- ADDED: Buffered channels can use transducers to transform values put onto them.
- CHANGED: Each goroutine now always returns a channel.
- CHANGED: `yield ch` now behaves the same as `yield take(ch)`.
- CHANGED: `sleep` is deprecated in favor of `timeout`.

## 0.2.3
- FIXED: Pending puts are now properly processed when takes make place for them in the buffer.

## 0.2.0
- ADDED: Channel operations, grouped under `csp.operations` (map, filter, pipe...).
- ADDED: Named special values:
  + `DEFAULT`: Returned as `.channel` when no operation is ready for a non-blocking `alts`.
  + `CLOSED`: Returned when taking from a closed channel (still equal to `null`).
- ADDED: More example from Go slides.
- CHANGED: Rename `wait` into `sleep`.
- FIXED: Goroutine's output channel is now closed after return value is delivered.

## 0.1.3

- CHANGED: More reliable `mocha` test helpers.
- FIXED: Delayed puts now correctly returns `true` on succeed.

## 0.1.2

- ADDED: Priority and default options for `alts`.
- ADDED: Tests.
- ADDED: Examples.
- ADDED: Preliminary documentation.
- REMOVED: `stop`.
- CHANGED: Small optimization for `alts`.
- CHANGED: camelCase for public APIs.
- FIXED: `yield`ing normal values is now allowed.
- FIXED: Returning value from goroutine is now allowed.
- FIXED: Closing channels now does not hang pending puts.

## 0.1.1

- FIXED: Call stack no longer grows unboundedly when results are immediately available.

## 0.1.0

- Initial release.

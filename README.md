# js-csp
Communicating sequential processes for Javascript (like Clojurescript core.async, or Go).

**WARNING: This is currently alpha  software.**

This is an almost exact clone of Clojurescript's `core.async`. The most significant difference is that the IOC logic is encapsulated using generators (`yield`) instead of macros.

An equivalent library is being implemented in Python. It currently has more features, and is better documented.
https://github.com/ubolonton/twisted-csp

## Running examples ##

```bash
node --harmony examples/go/pingpong
```

## TODO ##

- Feature parity with Clojurescript's `core.async`.
- More documentation and examples.

## Inspiration ##

- http://swannodette.github.io/2013/08/24/es6-generators-and-csp
- https://github.com/clojure/core.async
- https://github.com/olahol/node-csp

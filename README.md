# js-csp
Communicating sequential processes for Javascript (like Clojurescript core.async, or Go).

**WARNING: This is currently alpha  software.**

## Examples ##

[More examples](examples/README.md).

## Supported runtimes ##
js-csp requires ES6 generators

### Firefox >= 27 ###
Earlier versions of Firefox either had ES6 generators turned off, or supported old style generators.

### Node.JS >= 0.11.6 ###
Run with `--harmony` or `--harmony-generators` flag.
Check support using
```bash
    node --v8-options | grep harmony
```

### Chrome with experimental flag turned on###
Look for "Enable Experimental JavaScript" at [chrome://flags](chrome://flags).

### Other ###
Use one of the js-to-js compilers:
- [Facebook Regenerator](http://facebook.github.io/regenerator/).
- [Google Traceur](https://github.com/google/traceur-compiler).

Or, if you use Python's Twisted:
https://github.com/ubolonton/twisted-csp

Or, if you want a better language:
https://github.com/clojure/core.async

## API ##

This is an almost exact clone of Clojurescript's `core.async`. The most significant difference is that the IOC logic is encapsulated using generators (`yield`) instead of macros.

### Base operations ###

### Other types of endpoint ###

### Composition operations ###

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

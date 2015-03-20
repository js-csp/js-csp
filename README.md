[![Build Status](https://travis-ci.org/ubolonton/js-csp.svg?branch=master)](https://travis-ci.org/ubolonton/js-csp)

# js-csp
Communicating sequential processes for Javascript (like Clojurescript core.async, or Go).

## Examples ##
```javascript
var csp = require("js-csp");
```

Pingpong (ported from [Go](http://talks.golang.org/2013/advconc.slide#6)).
```javascript
function* player(name, table) {
  while (true) {
    var ball = yield csp.take(table);
    if (ball === csp.CLOSED) {
      console.log(name + ": table's gone");
      return;
    }
    ball.hits += 1;
    console.log(name + " " + ball.hits);
    yield csp.timeout(100);
    yield csp.put(table, ball);
  }
}

csp.go(function* () {
  var table = csp.chan();

  csp.go(player, ["ping", table]);
  csp.go(player, ["pong", table]);

  yield csp.put(table, {hits: 0});
  yield csp.timeout(1000);
  table.close();
});
```

There are more under [examples](examples/) directory.

## Documentation ##

- [Basic concepts and API](doc/basic.md).
- [Advanced operations](doc/advanced.md).

This is a very close port of Clojurescript's [core.async](https://github.com/clojure/core.async). The most significant difference is that the IOC logic is encapsulated using generators (`yield`) instead of macros. Therefore resources on `core.async` or Go channels are also helpful.

## Supported runtimes ##
js-csp requires ES6 generators.

#### Firefox >= 27 ####

Earlier versions of Firefox either had ES6 generators turned off, or supported only old style generators.

#### Node.JS >= 0.11.6 ####

Run with `--harmony` or `--harmony-generators` flag. Check support using
```bash
node --v8-options | grep harmony
```

#### Chrome >= 28 ####
Turn on an experimental flag. Look for "Enable Experimental JavaScript" at [chrome://flags](chrome://flags).

#### Other ####

Use one of the js-to-js compilers:
- [Babel](http://babeljs.io/docs/learn-es6/#generators)
- [Facebook Regenerator](http://facebook.github.io/regenerator/).
- [Google Closure Compiler](https://developers.google.com/closure/compiler/) with `--language_in ECMASCRIPT6 --language_out ECMASCRIPT3` flags.
- [Google Traceur](https://github.com/google/traceur-compiler).

Or, if you use Python's Twisted:
https://github.com/ubolonton/twisted-csp

Or, if you want a better language:
https://github.com/clojure/core.async

## Install ##

It's available for both `npm` and `bower`. For browsers, use [browserify](http://browserify.org/)+`npm` or `browserify`+`bower`+`debowerify`.
```bash
npm install js-csp
```
```bash
bower install js-csp
```

## Contribution ##

Feel free to open issues for questions/discussions, or create pull requests for improvement.

Some areas that need attention:
- More documentation, examples, and maybe some visualization. Porting RxJS/Bacon examples may help.
- Multiplexing, mixing, publishing/subscribing. These need to be tested more. The API could also be improved.
- Deadlock detection.

## Inspiration ##

- http://swannodette.github.io/2013/08/24/es6-generators-and-csp
- https://github.com/clojure/core.async
- https://github.com/olahol/node-csp

## License ##

Distributed under [MIT License](http://opensource.org/licenses/MIT).

[![Build Status](https://travis-ci.org/ubolonton/js-csp.svg?branch=master)](https://travis-ci.org/ubolonton/js-csp)
[![codecov](https://codecov.io/gh/ubolonton/js-csp/branch/master/graph/badge.svg)](https://codecov.io/gh/ubolonton/js-csp)
[![Dependency Status](https://david-dm.org/ubolonton/js-csp.svg)](https://david-dm.org/ubolonton/js-csp)
[![devDependency Status](https://david-dm.org/ubolonton/js-csp/dev-status.svg)](https://david-dm.org/ubolonton/js-csp#info=devDependencies)

# js-csp
Communicating sequential processes for Javascript (like Clojurescript core.async, or Go).

## Examples
```javascript
const csp = require('js-csp');
```

Pingpong (ported from [Go](http://talks.golang.org/2013/advconc.slide#6)).

```javascript
function* player(name, table) {
  while (true) {
    let ball = yield csp.take(table);

    if (ball === csp.CLOSED) {
      console.log(name + ": table's gone");
      return;
    }

    ball.hits += 1;
    console.log(`${name} ${ball.hits}`);

    yield csp.timeout(100);
    yield csp.put(table, ball);
  }
}

csp.go(function* () {
  const table = csp.chan();

  csp.go(player, ["ping", table]);
  csp.go(player, ["pong", table]);

  yield csp.put(table, {hits: 0});
  yield csp.timeout(1000);

  table.close();
});
```

There are more under [examples](examples/) directory.

## Documentation

- [Basic concepts and API](doc/basic.md).
- [Advanced operations](doc/advanced.md).

This is a very close port of Clojurescript's [core.async](https://github.com/clojure/core.async). The most significant difference
is that the IOC logic is encapsulated using generators (`yield`) instead of macros. Therefore resources on `core.async` or Go channels are also helpful.

## Other

Or, if you use Python's Twisted:
https://github.com/ubolonton/twisted-csp

Or, if you want a better language:
https://github.com/clojure/core.async

## Install

```bash
npm install js-csp
```

```bash
bower install js-csp
```

## Contribution

Feel free to open issues for questions/discussions, or create pull requests for improvement.

Some areas that need attention:
- More documentation, examples, and maybe some visualization. Porting RxJS/Bacon examples may help.
- Multiplexing, mixing, publishing/subscribing. These need to be tested more. The API could also be improved.
- Deadlock detection.

### Development

These commands are supposed to run separately
```bash
$ npm run test:watch
$ npm run lint # for code quality checking
$ npm run flow:watch # to stop server after you are done run npm run flow:stop
```

### Production

```bash
$ npm run build
```

It will transpile all the codes in `src` to `lib`, or even better if you use `webpack 2` to consume
the lib via `"module": "./src/csp.js"`.

## Inspiration

- http://swannodette.github.io/2013/08/24/es6-generators-and-csp
- https://github.com/clojure/core.async
- https://github.com/olahol/node-csp

## License

Distributed under [MIT License](http://opensource.org/licenses/MIT).

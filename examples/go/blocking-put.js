const csp = require('./../../lib/js-csp');
const ch = csp.chan();

csp.go(function*() {
  while (true) {
    const value = yield ch;
    // OR
    // const value = yield csp.alts([ch]);

    console.log('closed:', ch.closed, ', value:', value);

    if (value === csp.CLOSED) {
      break;
    }
  }
});

csp.go(function*() {
  yield csp.put(ch, 'foo');
  yield csp.put(ch, 'bar');
  yield csp.put(ch, 'baz');
  ch.close();
});

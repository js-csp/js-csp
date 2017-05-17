'use strict'; // eslint-disable-line

// http://talks.golang.org/2013/advconc.slide#6
const csp = require('../../lib/js-csp');

function* player(name, table) {
  for (;;) {
    const ball = yield csp.take(table);

    if (ball === csp.CLOSED) {
      console.log(`${name}: table's gone`); // eslint-disable-line
      return;
    }

    ball.hits += 1;
    console.log(`${name} ${ball.hits}`); // eslint-disable-line

    yield csp.timeout(100);
    yield csp.put(table, ball);
  }
}

csp.go(function*() {
  const table = csp.chan();

  csp.go(player, ['ping', table]);
  csp.go(player, ['pong', table]);

  yield csp.put(table, { hits: 0 });
  yield csp.timeout(1000);

  table.close();
});

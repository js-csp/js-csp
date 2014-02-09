// http://talks.golang.org/2013/advconc.slide#6
var csp = require("../../src/csp");

function* player(name, table) {
  while (true) {
    var ball = yield csp.take(table);
    ball.hits += 1;
    console.log(name + " " + ball.hits);
    yield csp.wait(100);
    yield csp.put(table, ball);
  }
}

csp.go(function* () {
  var table = csp.chan();

  csp.go(player, ["ping", table]);
  csp.go(player, ["pong", table]);

  yield csp.put(table, {hits: 0});
  yield csp.wait(1000);
  process.exit(0);
});

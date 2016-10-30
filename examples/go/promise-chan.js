require('babel-register');

const csp = require('./../../src/csp');

const promiseCh = csp.promiseChan();

csp.go(function* () {
  console.log('consumer 1 gets', yield csp.take(promiseCh));
  console.log('consumer 1 gets', yield csp.take(promiseCh));
});

csp.go(function* () {
  console.log('consumer 2 gets', yield csp.take(promiseCh));
  console.log('consumer 2 gets', yield csp.take(promiseCh));
});

csp.go(function* () {
  yield csp.take(csp.timeout(1000));

  yield csp.put(promiseCh, 'Hello from the other side');
});

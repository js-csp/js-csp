require('babel-register');

const fetch = require('isomorphic-fetch');
const csp = require('./../../src/csp');

csp.go(function* () {
  console.log(yield csp.take(
    csp.operations.fromPromise(
      fetch('https://api.github.com/users/octocat/repos').then(data => data.json())
    )
  ));
});


const csp = require('./../../lib/js-csp');
const fetch = require('isomorphic-fetch');

csp.go(function*() {
  console.log(
    yield csp.take(
      csp.operations.fromPromise(
        fetch('https://api.github.com/users/octocat/repos').then(data =>
          data.json())
      )
    )
  );
});

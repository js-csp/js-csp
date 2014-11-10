
function logFailure(failure) {
  var stacks = Array.prototype.slice.call(failure.stacks);

  console.error(failure.error.stack);
  stacks.forEach(function(err) {
    console.error(err.stack);
  });
}

var state = {
  stackHistory: false,
  logFailure: logFailure,

  setters: {
    stackHistory: function(x) {
      state.stackHistory = x;
    }
  }
}

module.exports = state;

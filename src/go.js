const spawn = require('./spawn');

module.exports = function go(f, args = []) {
  return spawn(f(...args), f);
};

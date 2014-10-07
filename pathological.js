var csp = require('./src/csp.js');

var expander = function(factor){
  return function(step) {
    return function(result, value) {
      for (var i = 0; i < factor; ++i)
        result = step(result, value);
      return result;
    };
  };
};

var seed = csp.chan();
var v = csp.chan(csp.buffers.fixed(1), expander(3));
csp.go(function*() {
  var limit = (yield csp.take(seed));
  for (var i = 0; i < limit; ++i) {
    yield csp.put(v, i);
  }
  v.close();
});

var c = csp.go(function*() {
  var count = 0;
  var sum = 0;
  var value;
  while ((value = (yield csp.take(v))) !== csp.CLOSED) {
    count++;
    sum += value;
  }
  return [sum, count];
});

var limit = 20000;
csp.putAsync(seed, limit, function(){});
csp.takeAsync(c, function(val) {
  console.log(val);
  console.log(v.buf.buf.capacity, v.overflow.capacity);
});
var sum = 0;
for (var i = 0; i < limit; ++i)
  sum += i;
console.log(" ", sum * 3, "", limit * 3);

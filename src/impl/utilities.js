"use strict";

var csp = require('../csp');
var chan = csp.chan;


function toArray(args){
  return Array.prototype.slice.call(args);
}

function putArgumentsIntoChannel(ch){
  return function(){
    if(arguments.length === 1){
      csp.putAsync(ch, arguments[0]);
    } else {
      csp.putAsync(ch, toArray(arguments));
    }
  };
}

function promiseToChannel(promise, channelOptions){

  var ch = chan(channelOptions);

  promise
    .then(putArgumentsIntoChannel(ch))
    .catch(putArgumentsIntoChannel(ch));

  return ch;

}

function dePromiseify(promiseReturningFunction, channelOptions, ctx){
  ctx = ctx || null;
  return function(){
    promiseToChannel(promiseReturningFunction.apply(ctx, arguments), channelOptions);
  };
}

function deNodeify(callbackTakingFunction, channelOptions, ctx){
  ctx = ctx || null;
  return function(){
    var args = toArray(arguments);
    var ch = chan(channelOptions);

    callbackTakingFunction.apply(ctx, args.concat(function(){
      var args = toArray(arguments);
      var err = args[0];
      args = args.slice(1);
      if(err){
        csp.put(ch, err);
      } else {
        csp.put(ch, (args.length === 1 ? args[0] : args));
      }
    }));

    return ch;
  };
}

function deCallbackify(callbackTakingFunction, channelOptions, ctx){
  ctx = ctx || null;
  return function(){
    var args = toArray(arguments);
    var ch = chan(channelOptions);

    callbackTakingFunction.apply(ctx, args.concat(putArgumentsIntoChannel(ch)));

    return ch;
  };
}

function dePromiseifyAll(obj, channelOptions, suffix){
  suffix = suffix || 'Chan';

  for(var key in obj){
    if(typeof obj[key] === 'function' && obj[key + suffix] === undefined){
      obj[key + suffix] = dePromiseify(obj[key], channelOptions, obj);
    }
  }

  return obj;
}

function deNodeifyAll(obj, channelOptions, suffix){
  suffix = suffix || 'Chan';

  for(var key in obj){
    if(typeof obj[key] === 'function' && obj[key + suffix] === undefined){
      obj[key + suffix] = deNodeify(obj[key], channelOptions, obj);
    }
  }

  return obj;
}

function deCallbackifyAll(obj, channelOptions, suffix){
  suffix = suffix || 'Chan';

  for(var key in obj){
    if(typeof obj[key] === 'function' && obj[key + suffix] === undefined){
      obj[key + suffix] = deCallbackify(obj[key], channelOptions, obj);
    }
  }

  return obj;
}

module.exports.dePromiseify = dePromiseify;
module.exports.dePromiseifyAll = dePromiseifyAll;
module.exports.deNodeify = deNodeify;
module.exports.deNodeifyAll = deNodeifyAll;
module.exports.deCallbackify = deCallbackify;
module.exports.deCallbackifyAll = deCallbackifyAll;
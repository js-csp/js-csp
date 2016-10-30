import { fixed, dropping, sliding, promise } from './impl/buffers';
import {
  mapFrom, mapInto, filterFrom, filterInto,
  removeFrom, removeInto, mapcatFrom, mapcatInto,
  pipe, split, reduce, onto, fromColl, map,
  merge, into, take as takeN,
  unique, partitionBy, partition, mult, mix, pub,
  pipeline, pipelineAsync,
} from './csp.operations';

export const operations = {
  mapFrom,
  mapInto,
  filterFrom,
  filterInto,
  removeFrom,
  removeInto,
  mapcatFrom,
  mapcatInto,
  pipe,
  split,
  reduce,
  onto,
  fromColl,
  map,
  merge,
  into,
  unique,
  partitionBy,
  partition,
  mult,
  mix,
  pub,
  pipeline,
  pipelineAsync,
  take: takeN,
};
export const buffers = { fixed, dropping, sliding, promise };
export { CLOSED } from './impl/channels';
export { timeout } from './impl/timers';
export { DEFAULT } from './impl/results';
export {
  put, take,
  offer, poll,
  sleep, alts,
  putThenCallback as putAsync, takeThenCallback as takeAsync,
  NO_VALUE,
} from './impl/process';
export { spawn, go, chan, promiseChan } from './csp.core';

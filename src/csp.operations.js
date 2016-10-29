import times from 'lodash/times';
import { Box } from './impl/boxes';
import { CLOSED } from './impl/channels';
import {
  take as _take,
  put,
  takeThenCallback as takeAsync,
  putThenCallback as putAsync,
  alts,
} from './impl/process';
import { go, chan } from './csp.core';

export function mapFrom(f, ch) {
  return {
    isClosed() {
      return ch.isClosed();
    },
    close() {
      ch.close();
    },
    put(value, handler) {
      return ch.put(value, handler);
    },
    take(handler) {
      const result = ch.take({
        isActive() {
          return handler.isActive();
        },
        commit() {
          const takeCallback = handler.commit();
          return value => takeCallback(value === CLOSED ? CLOSED : f(value));
        },
      });

      if (result) {
        const value = result.value;
        return new Box(value === CLOSED ? CLOSED : f(value));
      }

      return null;
    },
  };
}

export function mapInto(f, ch) {
  return {
    isClosed() {
      return ch.isClosed();
    },
    close() {
      ch.close();
    },
    put(value, handler) {
      return ch.put(f(value), handler);
    },
    take(handler) {
      return ch.take(handler);
    },
  };
}

export function filterFrom(p, ch, bufferOrN) {
  const out = chan(bufferOrN);

  go(function* () {
    for (;;) {
      const value = yield _take(ch);
      if (value === CLOSED) {
        out.close();
        break;
      }

      if (p(value)) {
        yield put(out, value);
      }
    }
  });
  return out;
}

export function filterInto(p, ch) {
  return {
    isClosed() {
      return ch.isClosed();
    },
    close() {
      ch.close();
    },
    put(value, handler) {
      if (p(value)) {
        return ch.put(value, handler);
      }

      return new Box(!ch.isClosed());
    },
    take(handler) {
      return ch.take(handler);
    },
  };
}

export function removeFrom(p, ch) {
  return filterFrom(value => !p(value), ch);
}

export function removeInto(p, ch) {
  return filterInto(value => !p(value), ch);
}

function* mapcat(f, src, dst) {
  for (;;) {
    const value = yield _take(src);
    if (value === CLOSED) {
      dst.close();
      break;
    } else {
      const seq = f(value);
      const length = seq.length;
      for (let i = 0; i < length; i += 1) {
        yield put(dst, seq[i]);
      }
      if (dst.isClosed()) {
        break;
      }
    }
  }
}

export function mapcatFrom(f, ch, bufferOrN) {
  const out = chan(bufferOrN);
  go(mapcat, [f, ch, out]);
  return out;
}

export function mapcatInto(f, ch, bufferOrN) {
  const src = chan(bufferOrN);
  go(mapcat, [f, src, ch]);
  return src;
}

export function pipe(src, dst, keepOpen) {
  go(function* () {
    for (;;) {
      const value = yield _take(src);
      if (value === CLOSED) {
        if (!keepOpen) {
          dst.close();
        }
        break;
      }
      if (!(yield put(dst, value))) {
        break;
      }
    }
  });
  return dst;
}

export function split(p, ch, trueBufferOrN, falseBufferOrN) {
  const tch = chan(trueBufferOrN);
  const fch = chan(falseBufferOrN);
  go(function* () {
    for (;;) {
      const value = yield _take(ch);
      if (value === CLOSED) {
        tch.close();
        fch.close();
        break;
      }
      yield put(p(value) ? tch : fch, value);
    }
  });
  return [tch, fch];
}

export function reduce(f, init, ch) {
  return go(function* () {
    let result = init;
    for (;;) {
      const value = yield _take(ch);

      if (value === CLOSED) {
        return result;
      }

      result = f(result, value);
    }
  }, [], true);
}

export function onto(ch, coll, keepOpen) {
  return go(function* () {
    const length = coll.length;
    // FIX: Should be a generic looping interface (for...in?)
    for (let i = 0; i < length; i += 1) {
      yield put(ch, coll[i]);
    }
    if (!keepOpen) {
      ch.close();
    }
  });
}

// TODO: Bounded?
export function fromColl(coll) {
  const ch = chan(coll.length);
  onto(ch, coll);
  return ch;
}

export function map(f, chs, bufferOrN) {
  const out = chan(bufferOrN);
  const length = chs.length;
  // Array holding 1 round of values
  const values = new Array(length);
  // TODO: Not sure why we need a size-1 buffer here
  const dchan = chan(1);
  // How many more items this round
  let dcount;
  // put callbacks for each channel
  const dcallbacks = new Array(length);
  const callback = (i) => (value) => {
    values[i] = value;
    dcount -= 1;
    if (dcount === 0) {
      putAsync(dchan, values.slice(0));
    }
  };

  for (let i = 0; i < length; i += 1) {
    dcallbacks[i] = callback(i);
  }

  go(function* () {
    for (;;) {
      dcount = length;
      // We could just launch n goroutines here, but for effciency we
      // don't
      for (let i = 0; i < length; i += 1) {
        try {
          takeAsync(chs[i], dcallbacks[i]);
        } catch (e) {
          // FIX: Hmm why catching here?
          dcount -= 1;
        }
      }

      const _values = yield _take(dchan);
      for (let i = 0; i < length; i += 1) {
        if (_values[i] === CLOSED) {
          out.close();
          return;
        }
      }
      yield put(out, f(..._values));
    }
  });
  return out;
}

export function merge(chs, bufferOrN) {
  const out = chan(bufferOrN);
  const actives = chs.slice(0);
  go(function* () {
    for (;;) {
      if (actives.length === 0) {
        break;
      }
      const r = yield alts(actives);
      const value = r.value;
      if (value === CLOSED) {
        // Remove closed channel
        const i = actives.indexOf(r.channel);
        actives.splice(i, 1);
      } else {
        yield put(out, value);
      }
    }
    out.close();
  });
  return out;
}

export function into(coll, ch) {
  const result = coll.slice(0);
  return reduce((_result, item) => {
    _result.push(item);
    return _result;
  }, result, ch);
}

export function take(n, ch, bufferOrN) {
  const out = chan(bufferOrN);
  go(function* () {
    for (let i = 0; i < n; i += 1) {
      const value = yield _take(ch);
      if (value === CLOSED) {
        break;
      }
      yield put(out, value);
    }
    out.close();
  });
  return out;
}

const NOTHING = {};

export function unique(ch, bufferOrN) {
  const out = chan(bufferOrN);
  let last = NOTHING;
  go(function* () {
    for (;;) {
      const value = yield _take(ch);
      if (value === CLOSED) {
        break;
      }
      if (value !== last) {
        last = value;
        yield put(out, value);
      }
    }
    out.close();
  });
  return out;
}

export function partitionBy(f, ch, bufferOrN) {
  const out = chan(bufferOrN);
  let part = [];
  let last = NOTHING;
  go(function* () {
    for (;;) {
      const value = yield _take(ch);
      if (value === CLOSED) {
        if (part.length > 0) {
          yield put(out, part);
        }
        out.close();
        break;
      } else {
        const newItem = f(value);
        if (newItem === last || last === NOTHING) {
          part.push(value);
        } else {
          yield put(out, part);
          part = [value];
        }
        last = newItem;
      }
    }
  });
  return out;
}

export function partition(n, ch, bufferOrN) {
  const out = chan(bufferOrN);
  go(function* () {
    for (;;) {
      const part = new Array(n);
      for (let i = 0; i < n; i += 1) {
        const value = yield _take(ch);
        if (value === CLOSED) {
          if (i > 0) {
            yield put(out, part.slice(0, i));
          }
          out.close();
          return;
        }
        part[i] = value;
      }
      yield put(out, part);
    }
  });
  return out;
}

// For channel identification
const genId = ((() => {
  let i = 0;

  return () => {
    i += 1;
    return `${i}`;
  };
}))();

const ID_ATTR = '__csp_channel_id';

function chanId(ch) {
  let id = ch[ID_ATTR];

  if (id === undefined) {
    id = ch[ID_ATTR] = genId();
  }
  return id;
}

class Tap {
  constructor(channel, keepOpen) {
    this.channel = channel;
    this.keepOpen = keepOpen;
  }
}

class Mult {
  constructor(ch) {
    this.taps = {};
    this.ch = ch;
  }

  muxch() {
    return this.ch;
  }

  tap(ch, keepOpen) {
    this.taps[chanId(ch)] = new Tap(ch, keepOpen);
  }

  untap(ch) {
    delete this.taps[chanId(ch)];
  }

  untapAll() {
    this.taps = {};
  }
}

export function mult(ch) {
  const m = new Mult(ch);
  const dchan = chan(1);
  let dcount;

  function makeDoneCallback(tap) {
    return (stillOpen) => {
      dcount -= 1;
      if (dcount === 0) {
        putAsync(dchan, true);
      }
      if (!stillOpen) {
        m.untap(tap.channel);
      }
    };
  }

  go(function* () {
    for (;;) {
      const value = yield _take(ch);
      const taps = m.taps;
      let t;

      if (value === CLOSED) {
        Object.keys(taps).forEach((id) => {
          t = taps[id];
          if (!t.keepOpen) {
            t.channel.close();
          }
        });

        // TODO: Is this necessary?
        m.untapAll();
        break;
      }
      dcount = Object.keys(taps).length;
      // XXX: This is because putAsync can actually call back
      // immediately. Fix that
      const initDcount = dcount;
      // Put value on tapping channels...
      Object.keys(taps).forEach((id) => {
        t = taps[id];
        putAsync(t.channel, value, makeDoneCallback(t));
      });
      // ... waiting for all puts to complete
      if (initDcount > 0) {
        yield _take(dchan);
      }
    }
  });
  return m;
}

mult.tap = (m, ch, keepOpen) => {
  m.tap(ch, keepOpen);
  return ch;
};

mult.untap = (m, ch) => {
  m.untap(ch);
};

mult.untapAll = (m) => {
  m.untapAll();
};

const MIX_MUTE = 'mute';
const MIX_PAUSE = 'pause';
const MIX_SOLO = 'solo';
const VALID_SOLO_MODES = [MIX_MUTE, MIX_PAUSE];

class Mix {
  constructor(ch) {
    this.ch = ch;
    this.stateMap = {};
    this.change = chan();
    this.soloMode = MIX_MUTE;
  }

  _changed() {
    putAsync(this.change, true);
  }

  _getAllState() {
    const stateMap = this.stateMap;
    const solos = [];
    const mutes = [];
    const pauses = [];
    let reads;

    Object.keys(stateMap).forEach((id) => {
      const chanData = stateMap[id];
      const state = chanData.state;
      const channel = chanData.channel;
      if (state[MIX_SOLO]) {
        solos.push(channel);
      }
      // TODO
      if (state[MIX_MUTE]) {
        mutes.push(channel);
      }
      if (state[MIX_PAUSE]) {
        pauses.push(channel);
      }
    });

    let i;
    let n;
    if (this.soloMode === MIX_PAUSE && solos.length > 0) {
      n = solos.length;
      reads = new Array(n + 1);
      for (i = 0; i < n; i += 1) {
        reads[i] = solos[i];
      }
      reads[n] = this.change;
    } else {
      reads = [];
      Object.keys(stateMap).forEach((id) => {
        const chanData = stateMap[id];
        const channel = chanData.channel;
        if (pauses.indexOf(channel) < 0) {
          reads.push(channel);
        }
      });
      reads.push(this.change);
    }

    return { solos, mutes, reads };
  }

  admix(ch) {
    this.stateMap[chanId(ch)] = {
      channel: ch,
      state: {},
    };
    this._changed();
  }

  unmix(ch) {
    delete this.stateMap[chanId(ch)];
    this._changed();
  }

  unmixAll() {
    this.stateMap = {};
    this._changed();
  }

  toggle(updateStateList) {
    // [[ch1, {}], [ch2, {solo: true}]];
    const length = updateStateList.length;
    for (let i = 0; i < length; i += 1) {
      const ch = updateStateList[i][0];
      const id = chanId(ch);
      const updateState = updateStateList[i][1];
      let chanData = this.stateMap[id];

      if (!chanData) {
        chanData = this.stateMap[id] = {
          channel: ch,
          state: {},
        };
      }
      Object.keys(updateState).forEach((mode) => {
        chanData.state[mode] = updateState[mode];
      });
    }
    this._changed();
  }

  setSoloMode(mode) {
    if (VALID_SOLO_MODES.indexOf(mode) < 0) {
      throw new Error('Mode must be one of: ', VALID_SOLO_MODES.join(', '));
    }
    this.soloMode = mode;
    this._changed();
  }
}

export function mix(out) {
  const m = new Mix(out);
  go(function* () {
    let state = m._getAllState();

    for (;;) {
      const result = yield alts(state.reads);
      const value = result.value;
      const channel = result.channel;

      if (value === CLOSED) {
        delete m.stateMap[chanId(channel)];
        state = m._getAllState();
      } else if (channel === m.change) {
        state = m._getAllState();
      } else {
        const solos = state.solos;

        if (solos.indexOf(channel) > -1 ||
          (solos.length === 0 && !(state.mutes.indexOf(channel) > -1))) {
          const stillOpen = yield put(out, value);
          if (!stillOpen) {
            break;
          }
        }
      }
    }
  });
  return m;
}

mix.add = function admix(m, ch) {
  m.admix(ch);
};

mix.remove = function unmix(m, ch) {
  m.unmix(ch);
};

mix.removeAll = function unmixAll(m) {
  m.unmixAll();
};

mix.toggle = function toggle(m, updateStateList) {
  m.toggle(updateStateList);
};

mix.setSoloMode = function setSoloMode(m, mode) {
  m.setSoloMode(mode);
};

function constantlyNull() {
  return null;
}

class Pub {
  constructor(ch, topicFn, bufferFn) {
    this.ch = ch;
    this.topicFn = topicFn;
    this.bufferFn = bufferFn;
    this.mults = {};
  }

  _ensureMult(topic) {
    let m = this.mults[topic];
    const bufferFn = this.bufferFn;
    if (!m) {
      m = this.mults[topic] = mult(chan(bufferFn(topic)));
    }
    return m;
  }

  sub(topic, ch, keepOpen) {
    const m = this._ensureMult(topic);
    return mult.tap(m, ch, keepOpen);
  }

  unsub(topic, ch) {
    const m = this.mults[topic];
    if (m) {
      mult.untap(m, ch);
    }
  }

  unsubAll(topic) {
    if (topic === undefined) {
      this.mults = {};
    } else {
      delete this.mults[topic];
    }
  }
}

export function pub(ch, topicFn, bufferFn = constantlyNull) {
  const p = new Pub(ch, topicFn, bufferFn);
  go(function* () {
    for (;;) {
      const value = yield _take(ch);
      const mults = p.mults;
      if (value === CLOSED) {
        Object.keys(mults).forEach((topic) => {
          mults[topic].muxch().close();
        });
        break;
      }
      // TODO: Somehow ensure/document that this must return a string
      // (otherwise use proper (hash)maps)
      const topic = topicFn(value);
      const m = mults[topic];
      if (m) {
        const stillOpen = yield put(m.muxch(), value);
        if (!stillOpen) {
          delete mults[topic];
        }
      }
    }
  });
  return p;
}

pub.sub = (p, topic, ch, keepOpen) => p.sub(topic, ch, keepOpen);

pub.unsub = (p, topic, ch) => {
  p.unsub(topic, ch);
};

pub.unsubAll = (p, topic) => {
  p.unsubAll(topic);
};

function pipelineInternal(n, to, from, close, taskFn) {
  if (n <= 0) {
    throw new Error('n must be positive');
  }

  const jobs = chan(n);
  const results = chan(n);

  times(n, () => {
    go(function* (_taskFn, _jobs, _results) {
      for (;;) {
        const job = yield _take(_jobs);

        if (!_taskFn(job)) {
          _results.close();
          break;
        }
      }
    }, [taskFn, jobs, results]);
  });

  go(function* (_jobs, _from, _results) {
    for (;;) {
      const v = yield _take(_from);

      if (v === CLOSED) {
        _jobs.close();
        break;
      }

      const p = chan(1);

      yield put(_jobs, [v, p]);
      yield put(_results, p);
    }
  }, [jobs, from, results]);

  go(function* (_results, _close, _to) {
    for (;;) {
      const p = yield _take(_results);

      if (p === CLOSED) {
        if (_close) {
          _to.close();
        }
        break;
      }

      const res = yield _take(p);

      for (;;) {
        const v = yield _take(res);

        if (v === CLOSED) {
          break;
        }

        yield put(_to, v);
      }
    }
  }, [results, close, to]);

  return to;
}

export function pipeline(to, xf, from, keepOpen, exHandler) {
  function taskFn(job) {
    if (job === CLOSED) {
      return null;
    }

    const [v, p] = job;
    const res = chan(1, xf, exHandler);

    go(function* (ch, value) {
      yield put(ch, value);
      res.close();
    }, [res, v]);

    putAsync(p, res);

    return true;
  }

  return pipelineInternal(1, to, from, !keepOpen, taskFn);
}

export function pipelineAsync(n, to, af, from, keepOpen) {
  function taskFn(job) {
    if (job === CLOSED) {
      return null;
    }

    const [v, p] = job;
    const res = chan(1);
    af(v, res);
    putAsync(p, res);

    return true;
  }

  return pipelineInternal(n, to, from, !keepOpen, taskFn);
}
// Possible "fluid" interfaces:

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc],
//   [into, []]
// )

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc, _],
//   [into, [], _]
// )

// wrap()
//   .fromColl([1, 2, 3, 4])
//   .mapFrom(inc)
//   .into([])
//   .unwrap();

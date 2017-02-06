// @flow

export function noop() { }

export function has(o: Any, prop: string) {
  return o && Object.prototype.hasOwnProperty.call(o, prop);
}

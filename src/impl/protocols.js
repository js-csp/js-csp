// @flow
export const MAX_QUEUE_SIZE = 1024;

export interface MMCInterface {
  abort(): void,
}

export interface ReadPortInterface {
  // derefable val if taken, nil if take was enqueued
  take(fnHandler: Function): any,
}

export interface WritePortInterface {
  // derefable boolean (false if already closed) if handled, nil if put was enqueued. Must throw on nil val.
  put(val: any, fnHandler: Function): any,
}

export interface ChannelInterface {
  close(): void,
  isClosed(): boolean,
}

export interface HandlerInterface {
  // returns true if has callback. Must work w/o lock
  isActive(): boolean,
  // returns true if this handler may be blocked, otherwise it must not block
  isBlockable(): boolean,
  // commit to fulfilling its end of the transfer, returns cb. Must be called within lock
  commit(): Function,
}

export interface BufferInterface<T> {
  // returns true if buffer cannot accept put
  isFull(): boolean,
  // remove and return next item from buffer, called under chan mutex
  remove(): ?T,
  // if room, add item to the buffer, returns b, called under chan mutex
  add(item: ?T): void,
  // called on chan closed under chan mutex, return ignored
  closeBuffer(): void,
  count(): number,
}

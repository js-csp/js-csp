// @flow
import type { HandlerType } from './handlers';

export class Box<T> {
  value: T;

  constructor(value: T) {
    this.value = value;
  }
}

export class PutBox<T> {
  handler: HandlerType;
  value: T;

  constructor(handler: HandlerType, value: T) {
    this.handler = handler;
    this.value = value;
  }
}

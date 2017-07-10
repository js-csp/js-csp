// @flow
import type { HandlerInterface } from './protocols';

export class Box {
  value: any;

  constructor(value: any) {
    this.value = value;
  }
}

export class PutBox {
  handler: HandlerInterface;
  value: any;

  constructor(handler: HandlerInterface, value: any) {
    this.handler = handler;
    this.value = value;
  }
}

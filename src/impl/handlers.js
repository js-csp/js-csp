// @flow
import noop from 'lodash/noop';
import { Box } from './boxes';

export class FnHandler {
  blockable: boolean;
  func: Function;

  constructor(blockable: boolean, func: ?Function) {
    this.blockable = blockable;
    this.func = func || noop;
  }

  isActive(): boolean { // eslint-disable-line
    return true;
  }

  isBlockable(): boolean {
    return this.blockable;
  }

  commit(): Function {
    return this.func;
  }
}

export class AltHandler {
  flag: Box<boolean>;
  func: Function;

  constructor(flag: Box<boolean>, func: Function) {
    this.flag = flag;
    this.func = func;
  }

  isActive(): boolean {
    return this.flag.value;
  }

  isBlockable(): boolean { // eslint-disable-line
    return true;
  }

  commit(): Function {
    this.flag.value = false;
    return this.func;
  }
}

export type HandlerType = FnHandler | AltHandler;

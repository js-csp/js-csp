// @flow
import noop from 'lodash/noop';
import { Box } from './boxes';
import type { HandlerInterface } from './protocols';

export class FnHandler implements HandlerInterface {
  blockable: boolean;
  func: Function;

  constructor(blockable: boolean, func: ?Function) {
    this.blockable = blockable;
    this.func = func || noop;
  }

  isActive(): boolean {
    return true;
  }

  isBlockable(): boolean {
    return this.blockable;
  }

  commit(): Function {
    return this.func;
  }
}

export class AltHandler implements HandlerInterface {
  flag: Box;
  func: Function;

  constructor(flag: Box, func: Function) {
    this.flag = flag;
    this.func = func;
  }

  isActive(): boolean {
    return this.flag.value;
  }

  isBlockable(): boolean {
    return true;
  }

  commit(): Function {
    this.flag.value = false;
    return this.func;
  }
}

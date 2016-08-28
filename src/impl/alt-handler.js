import { Box } from './channels';

export default class AltHandler {
  flag: Box;
  f: Function;

  constructor(flag: Box, f: Function) {
    this.f = f;
    this.flag = flag;
  }

  isActive() {
    return this.flag.value;
  }

  isBlockable(): boolean {
    return true;
  }

  commit(): Function {
    this.flag.value = false;
    return this.f;
  }
}

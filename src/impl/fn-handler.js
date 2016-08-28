export default class FnHandler {
  blockable: boolean;
  func: ?Function;

  constructor(blockable: boolean, func: ?Function) {
    this.blockable = blockable;
    this.func = func;
  }

  isActive(): boolean {
    return true;
  }

  isBlockable(): boolean {
    return this.blockable;
  }

  commit(): ?Function {
    return this.func;
  }
}

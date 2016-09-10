export default class Instruction<T> {
  static TAKE: string = 'take';
  static PUT: string = 'put';
  static SLEEP: string = 'sleep';
  static ALTS: string = 'alts';

  op: string;
  data: T;

  constructor(op: string, data: T) {
    this.op = op;
    this.data = data;
  }

  toString(): string {
    return this.op;
  }
}

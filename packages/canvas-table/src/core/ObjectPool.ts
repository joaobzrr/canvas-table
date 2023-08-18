import { Factory } from "../types";

const INCREASE_PERCENT = 50;
const MINIMUM_PERCENT_FREE = 10;

export type ObjectPoolParams<T extends object> = {
  factory: Factory<T>;
  initialSize?: number;
}

export class ObjectPool<T extends object> {
  private elements: T[] = [];
  private freeElements = 0;
  private freeIndex = 0;

  private factory: Factory<T>;

  constructor(params: ObjectPoolParams<T>) {
    this.factory = params.factory;

    const { initialSize = 1000 } = params;
    for (let i = 0; i < initialSize; i++) {
      this.createElement();
    }
  }

  get size() {
    return this.elements.length;
  }

  public allocate<Element extends T>() {
    if (this.freeElements / this.elements.length <= MINIMUM_PERCENT_FREE / 100) {
      this.increasePoolSize();
    }

    this.freeElements--;
    const freeElement = this.elements[this.freeIndex]!;
    this.freeIndex++;
    return freeElement as Element;
  }

  public free(...elements: T[]) {
    for (const element of elements) {
      this.freeElements++;
      this.elements[--this.freeIndex] = element;
      this.factory.reset(element);
    }
  }

  private increasePoolSize() {
    const increaseSize = Math.round(
      (INCREASE_PERCENT * this.elements.length) / 100);

    for (let i = 0; i < increaseSize; i++) {
      this.createElement();
    }
  }

  private createElement() {
    this.freeElements++;
    this.elements.push(this.factory.reset(this.factory.make()));
    return this.elements[this.elements.length - 1];
  }
}

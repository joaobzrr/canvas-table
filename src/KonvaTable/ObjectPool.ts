const INCREASE_PERCENT = 50;
const MINIMUM_PERCENT_FREE = 10;

export type ObjectPoolParams<T> = {
  make: () => T;
  reset?: (object: T) => T;
  initialSize?: number;
}

export class ObjectPool<T extends object> {
  elements: T[] = [];
  freeElements = 0;
  freeIndex = 0;

  make: () => T;
  reset: (object: T) => T;

  constructor(params: ObjectPoolParams<T>) {
    this.make  = params.make;
    this.reset = params.reset ?? ((object: T) => object);

    const { initialSize = 1000 } = params;
    for (let i = 0; i < initialSize; i++) {
      this.createElement();
    }
  }

  borrow<Element extends T>() {
    if (this.freeElements / this.elements.length <= MINIMUM_PERCENT_FREE / 100) {
      this.increasePoolSize();
    }

    this.freeElements--;
    const freeElement = this.elements[this.freeIndex]!;
    this.freeIndex++;
    return freeElement as Element;
  }

  retrieve(...elements: T[]) {
    for (const element of elements) {
      this.freeElements++;
      this.elements[--this.freeIndex] = element;
      this.reset(element);
    }
  }

  increasePoolSize() {
    const increaseSize = Math.round(
      (INCREASE_PERCENT * this.elements.length) / 100);

    for (let i = 0; i < increaseSize; i++) {
      this.createElement();
    }
  }

  createElement() {
    this.freeElements++;
    this.elements.push(this.reset(this.make()));
    return this.elements[this.elements.length - 1];
  }

  get size() {
    return this.elements.length;
  }
}

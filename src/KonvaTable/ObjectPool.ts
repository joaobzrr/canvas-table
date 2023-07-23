const INCREASE_PERCENT = 50;
const MINIMUM_PERCENT_FREE = 10;

export type ObjectPoolParams<T> = {
  make: () => T;
  reset?: (object: T) => T;
  initialSize?: number;
}

export class ObjectPool<T extends object> {
  array: (T | null)[] = [];
  freeElements = 0;
  freeIndex = 0;

  make: () => T;
  reset: (object: T) => T;

  constructor(params: ObjectPoolParams<T>) {
    this.make  = params.make;
    this.reset = params.reset ?? ((object: T) => object);

    const { initialSize =  1000 } = params;
    for (let i = 0; i < initialSize; i++) {
      this.createElement();
    }
  }

  getOne() {
    if (this.freeElements / this.array.length <= MINIMUM_PERCENT_FREE / 100) {
      this.increasePoolSize();
    }

    this.freeElements--;
    const freeElement = this.array[this.freeIndex]!;
    this.array[this.freeIndex++] = null;
    return freeElement;
  }

  releaseOne(element: T) {
    this.freeElements++;
    this.array[--this.freeIndex] = element;
    this.reset(element);
  }

  releaseMany(elements: T[]) {
    for (const element of elements) {
      this.releaseOne(element);
    }
  }

  increasePoolSize() {
    const increaseSize = Math.round(
      (INCREASE_PERCENT * this.array.length) / 100);

    for (let i = 0; i < increaseSize; i++) {
      this.createElement();
    }

    console.log(this.array.length);
  }

  createElement() {
    this.freeElements++;
    this.array.push(this.reset(this.make()));
    return this.array[this.array.length - 1];
  }

  get size() {
    return this.array.length;
  }
}

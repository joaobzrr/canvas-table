type AllocatorOptions<T> = {
  initialSize?: number;
  make: () => T;
}

export class Allocator<T> {
  items = [] as T[];
  used = 0;

  make: () => T;

  constructor(options: AllocatorOptions<T>) {
    if (options.initialSize && options.initialSize < 0) {
      throw new Error("Initial size cannot be a negative number");
    }
    const initialSize = options.initialSize ?? 1;

    this.make = options.make;
    this.items = this.makeMany(initialSize);
  }

  useOne() {
    if (this.used === this.items.length) {
      this.items = this.items.concat(this.makeMany(this.items.length));
    }

    return this.items[this.used++];
  }

  clear() {
    this.used = 0;
  }

  makeMany(n: number) {
    return Array.from({ length: n }, this.make);
  }
}

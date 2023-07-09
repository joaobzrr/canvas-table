import Konva from "konva";

type DynamicGroupOptions<T> = {
  initialSize?: number;
  make: () => T;
}

export class DynamicGroup<T extends Konva.Group | Konva.Shape> extends Konva.Group {
  nodes = [] as T[];
  used = 0;

  make: () => T;

  constructor(options: DynamicGroupOptions<T>) {
    super();

    if (options.initialSize && options.initialSize < 0) {
      throw new Error("Initial size cannot be a negative number");
    }
    const initialSize = options.initialSize ?? 1;

    this.make = options.make;
    this.nodes = this.makeMany(initialSize);
  }

  useOne() {
    if (this.used === this.nodes.length) {
      this.nodes = this.nodes.concat(this.makeMany(this.nodes.length));
    }

    const node = this.nodes[this.used++];
    this.add(node);

    return node;
  }

  clear() {
    this.removeChildren();
    this.used = 0;
  }

  makeMany(n: number) {
    return Array.from({ length: n }, this.make);
  }
}

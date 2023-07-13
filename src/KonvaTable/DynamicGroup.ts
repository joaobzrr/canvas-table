import Konva from "konva";

type DynamicGroupOptions<SomeCtor> = {
  initialSize?: number;
  class: SomeCtor;
}

export class DynamicGroup<
  Ctor extends new (...args: any[]) => any
> extends Konva.Group {
  nodes = [] as InstanceType<Ctor>[];
  used = 0;

  ctor: Ctor;

  constructor(options: DynamicGroupOptions<Ctor>) {
    super();

    if (options.initialSize && options.initialSize < 0) {
      throw new Error("Initial size cannot be a negative number");
    }
    const initialSize = options.initialSize ?? 1;

    this.ctor = options.class;
    this.nodes = this.makeMany(initialSize);
  }

  useOne(config: ConstructorParameters<Ctor>[0]) {
    if (this.used === this.nodes.length) {
      this.nodes = this.nodes.concat(this.makeMany(this.nodes.length));
    }

    const node = this.nodes[this.used++];
    this.add(node);

    node.setAttrs(config);

    return node;
  }

  reset() {
    this.removeChildren();
    this.used = 0;
  }

  makeMany(n: number) {
    return Array.from({ length: n }, () => new this.ctor());
  }
}

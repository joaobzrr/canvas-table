import Konva from "konva";
import { ObjectPool } from "./ObjectPool";

export class NodeManager<T extends Konva.Group | Konva.Shape> {
  private pool: ObjectPool<T>;
  private group: Konva.Group;

  constructor(pool: ObjectPool<T>, group?: Konva.Group) {
    this.pool = pool;
    this.group = group ?? new Konva.Group();
  }

  public get() {
    const node = this.pool.allocate();
    this.group.add(node);
    return node;
  }

  public clear() {
    const children = this.group.children as T[];
    this.group.removeChildren();
    this.pool.free(...children);
  }

  public getGroup() {
    return this.group;
  }
}

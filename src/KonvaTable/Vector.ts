import isObject from "lodash/isObject";
import { VectorLike } from "./types";

export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number);
  constructor(coords: VectorLike);
  constructor(...args: any[]) {
    if (isObject(args[0])) {
      const { x, y } = args[0] as VectorLike;
      this.x = x;
      this.y = y;
    } else {
      const x = args[0] as number;
      const y = args[1] as number;
      this.x = x;
      this.y = y;
    }
  }

  static zero() {
    return new Vector(0, 0);
  }

  static unit() {
    return new Vector(1, 1);
  }

  data(): VectorLike {
    return { x: this.x, y: this.y };
  }

  copy() {
    return new Vector(this.x, this.y);
  }

  eq(other: Vector) {
    return this.x === other.x && this.y === other.y;
  }

  set(other: Partial<Vector | VectorLike>) {
    return new Vector(other.x ?? this.x, other.y ?? this.y);
  }

  add(other: Vector | VectorLike) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector | VectorLike) {
    return new Vector(this.x - other.x, this.y - other.y)
  }

  mul(other: Vector | VectorLike) {
    return new Vector(this.x * other.x, this.y * other.y);
  }

  div(other: Vector | VectorLike) {
    return new Vector(this.x / other.x, this.y / other.y);
  }

  reverse() {
    return new Vector(-this.x, -this.y);
  }

  max(max: Vector) {
    const x = Math.max(this.x, max.x);
    const y = Math.max(this.y, max.y);
    return new Vector(x, y);
  }

  min(max: Vector) {
    const x = Math.min(this.x, max.x);
    const y = Math.min(this.y, max.y);
    return new Vector(x, y);
  }

  clamp(min: Vector, max: Vector) {
    const x = this.x < min.x ? min.x : this.x > max.x ? max.x : this.x;
    const y = this.y < min.y ? min.y : this.y > max.y ? max.y : this.y;
    return new Vector(x, y);
  }
}

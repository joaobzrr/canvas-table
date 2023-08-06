import { Vector } from "./Vector";
import { RectLike, VectorLike } from "./types";

export class Rect {
  private _position: Vector;
  private _size: Vector;

  constructor(x: number, y: number, width: number, height: number) {
    if (width <= 0) {
      throw new Error("A rect's width cannot be less than zero");
    }
    if (height <= 0) {
      throw new Error("A rect's height cannot be less than zero");
    }

    this._position = new Vector(x, y);
    this._size = new Vector(width, height);
  }

  static create(init?: Partial<{ x: number, y: number, width: number, height: number }>) {
    const { x = 0, y = 0, width = 1, height = 1 } = init ?? {};
    return new Rect(x, y, width, height);
  }

  copy() {
    return new Rect(this._position.x, this._position.y, this._size.x, this._size.y);
  }

  get x() {
    return this._position.x;
  }

  set x(x: number) {
    this._position.x = x;
  }

  get y() {
    return this._position.y;
  }

  set y(y: number) {
    this._position.y = y;
  }

  get position() {
    return this._position.copy();
  }

  set position(position: VectorLike) {
    this._position.x = position.x;
    this._position.y = position.y;
  }

  get left() {
    return this._position.x;
  }

  set left(left: number) {
    this._position.x = left;
  }

  get top() {
    return this._position.y;
  }

  set top(top: number) {
    this._position.y = top;
  }

  get right() {
    return this._position.x + this._size.x;
  }

  set right(right: number) {
    this._position.x = right - this._size.x;
  }

  get bottom() {
    return this._position.y + this._size.y;
  }

  set bottom(bottom: number) {
    this._position.y = bottom - this._size.y;
  }

  get centerx() {
    return this._position.x + this._size.x / 2;
  }

  get centery() {
    return this._position.y + this._size.y / 2;
  }

  get width() {
    return this._size.x;
  }

  set width(width: number) {
    this._size.x = width;
  }

  get height() {
    return this._size.y;
  }

  set height(height: number) {
    this._size.y = height;
  }

  get size() {
    return this._size.copy();
  }

  set size(size: VectorLike) {
    this.size.x = size.x;
    this.size.y = size.y;
  }

  set(rect: RectLike) {
    this._position.x = rect.x;
    this._position.y = rect.y;
    this._size.x = rect.width;
    this._size.y = rect.height;
  }

  contains(point: Vector) {
    return (
      point.x >= this.left &&
      point.x <= this.right &&
      point.y >= this.top &&
      point.y <= this.bottom
    );
  }
}

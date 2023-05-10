import { Vector2 } from "./Vector2";

export class Rect {
    public position: Vector2;
    public size:     Vector2;

    constructor(x: number, y: number, width: number, height: number) {
        this.position = new Vector2(x, y);
        this.size = new Vector2(width, height);
    }

    copy() {
        return new Rect(this.position.x, this.position.y, this.size.x, this.size.y);
    }

    get left() {
        return this.position.x;
    }

    set left(left: number) {
        this.position.x = left;
    }

    get top() {
        return this.position.y;
    }

    set top(top: number) {
        this.position.y = top;
    }

    get width() {
        return this.size.x;
    }

    set width(width: number) {
        this.size.x = width;
    }

    get height() {
        return this.size.y;
    }

    set height(height: number) {
        this.size.y = height;
    }

    get right() {
        return this.position.x + this.size.x;
    }

    get centerx() {
        return this.position.x + this.size.x / 2;
    }

    get centery() {
        return this.position.y + this.size.y / 2;
    }

    set right(right: number) {
        this.position.x = right - this.size.x;
    }

    get bottom() {
        return this.position.y + this.size.y;
    }

    set bottom(bottom: number) {
        this.position.y = bottom - this.size.y;
    }

    contains(point: Vector2) {
        return (
            point.x >= this.left &&
            point.x <= this.right &&
            point.y >= this.top &&
            point.y <= this.bottom
        );
    }
}

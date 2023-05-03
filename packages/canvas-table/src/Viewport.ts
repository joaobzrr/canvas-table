import { Vector2 } from "./Vector2";

export class Viewport {
    position: Vector2;
    stack: Vector2[];

    constructor() {
        this.position = new Vector2(0, 0);
        this.stack = [];
    }

    push(offset: Vector2) {
        const new_offset = new Vector2(this.position.x + offset.x, this.position.y + offset.y);
        this.position = new_offset;
        this.stack.push(new_offset);
    }

    pop() {
        if (this.stack.length === 0) {
            return;
        }

        const last_offset = this.stack.pop()!;
        const new_offset = new Vector2(this.position.x - last_offset.x, this.position.y - last_offset.y);
        this.position = new_offset;
    }

    translate(offset: Vector2) {
        const new_offset = new Vector2(this.position.x + offset.x, this.position.y + offset.y);
        this.position = new_offset;

        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1] = new_offset;
        } else {
            this.stack.push(new_offset);
        }
    }

    translate_x(x: number) {
        this.translate(new Vector2(x, 0))
    }

    translate_y(y: number) {
        this.translate(new Vector2(0, y));
    }

    calc(offset: Vector2) {
        return offset.add(this.position);
    }

    calc_x(x: number) {
        return x + this.position.x;
    }

    calc_y(y: number) {
        return y + this.position.y;
    }
}

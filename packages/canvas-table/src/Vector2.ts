export class Vector2 {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    add(other: Vector2) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other: Vector2) {
        return new Vector2(this.x - other.x, this.y - other.y)
    }

    mul(scalar: number) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    div(scalar: number) {
        if (scalar === 0) {
            throw new Error("Division by zero");
        }
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    rev() {
        return new Vector2(-this.x, -this.y);
    }
}

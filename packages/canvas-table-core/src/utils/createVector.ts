import { Vector } from "../types";

export function createVector(): Vector;
export function createVector(partial: Partial<Vector> | undefined): Vector;
export function createVector(x: number, y: number): Vector;
export function createVector(...args: any[]): Vector {
  if (args.length === 0) {
    return { x: 0, y: 0 };
  } else if (args.length === 1) {
    return { x: 0, y: 0, ...args[0] };
  } else {
    return { x: args[0], y: args[1] };
  }
}

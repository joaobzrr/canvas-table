import { Rect } from "../types";

export function createRect(): Rect;
export function createRect(partial: Partial<Rect> | undefined): Rect;
export function createRect(x: number, y: number, width: number, height: number): Rect;
export function createRect(...args: any[]): Rect {
  if (args.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  } else if (args.length === 1) {
    return { x: 0, y: 0, width: 1, height: 1, ...args[0] };
  } else {
    return { x: args[0], y: args[1], width: args[2], height: args[3] };
  }
}

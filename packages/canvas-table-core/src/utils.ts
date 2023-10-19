import { Rect, Vector } from "./types";

export function shallowMerge<T1, T2>(obj1: T1, obj2: T2): T1 & T2;
export function shallowMerge<T1, T2, T3>(obj1: T1, obj2: T2, obj3: T3): T1 & T2 & T3;
export function shallowMerge<T extends any[]>(...args: T): any {
  const result = args[0];

  for (const obj of args.slice(1)) {
    if (obj === null || obj === undefined) {
      continue;
    }

    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

export function shallowMatch<T1 extends object, T2 extends object>(obj1: T1, obj2: T2) {
  for (const key of Object.keys(obj1)) {
    const o1 = obj1 as any;
    const o2 = obj2 as any;
    if (o1[key] !== undefined && o1[key] !== o2[key]) {
      return false;
    }
  }
  return true;
}

export function scale(
  value:   number,
  fromMin: number,
  fromMax: number,
  toMin:   number,
  toMax:   number
) {
  if (value <= fromMin) {
    return toMin;
  } else if (value >= fromMax) {
    return toMax;
  } else {
    return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
  }
}

export function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function isObject(val: any) {
  return val != null && val.constructor.name === "Object"
}

export function isNumber(val: any) {
  return typeof val === "number";
}

export function isPointInRect(point: Vector, rect: Rect) {
  return point.x >= rect.x && point.x < rect.x + rect.width &&
         point.y >= rect.y && point.y < rect.y + rect.height;
}

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

export function createFontSpecifier(fontFamily: string, fontSize: string, fontStyle: string) {
  return [fontStyle, fontSize, fontFamily].join(" ");
}

export function pathFromRect(rect: Rect) {
  const path = new Path2D();
  path.rect(rect.x, rect.y, rect.width, rect.height);
  return path;
}

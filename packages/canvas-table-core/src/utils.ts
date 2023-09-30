import { VectorLike, RectLike, Size } from "./types";

export function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let lastCalled = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const result = ((...args: any[]) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCalled;

    if (!lastCalled || timeSinceLastCall >= delay) {
      func(...args);
      lastCalled = now;
    } else if (!timeout) {
      timeout = setTimeout(() => {
        func(...args);
        lastCalled = now;
        timeout = null;
      }, delay - timeSinceLastCall);
    }
  }) as T;

  return result;
}

export function shallowMerge<T = Record<string, any>>(...objects: Record<string, any>[]): T {
  const result = {} as T;
  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        result[key as keyof T] = obj[key];
      }
    }
  }
  return result;
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

export function createRect(): RectLike;
export function createRect(partial: Partial<RectLike> | undefined): RectLike;
export function createRect(x: number, y: number, width: number, height: number): RectLike;
export function createRect(...args: any[]): RectLike {
  if (args.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  } else if (args.length === 1) {
    return { x: 0, y: 0, width: 1, height: 1, ...args[0] };
  } else {
    return { x: args[0], y: args[1], width: args[2], height: args[3] };
  }
}

export function createVector(): VectorLike;
export function createVector(partial: Partial<VectorLike> | undefined): VectorLike;
export function createVector(x: number, y: number): VectorLike;
export function createVector(...args: any[]): VectorLike {
  if (args.length === 0) {
    return { x: 0, y: 0 };
  } else if (args.length === 1) {
    return { x: 0, y: 0, ...args[0] };
  } else {
    return { x: args[0], y: args[1] };
  }
}

export function createSize(): Size;
export function createSize(partial: Partial<Size> | undefined): Size;
export function createSize(width: number, height: number): Size;
export function createSize(...args: any[]): Size {
  if (args.length === 0) {
    return { width: 0, height: 0 };
  } else if (args.length === 1) {
    return { width: 0, height: 0, ...args[0], };
  } else {
    return { width: args[0], height: args[1] };
  }
}

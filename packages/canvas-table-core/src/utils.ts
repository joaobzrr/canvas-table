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

export function createVector(props?: Partial<VectorLike>): VectorLike {
  return { x: 0, y: 0, ...props };
}

export function createSize(props?: Partial<Size>): Size {
  return { width: 1, height: 1, ...props };
}

export function createArea(props?: Partial<RectLike>): RectLike {
  return { x: 0, y: 0, width: 1, height: 1, ...props };
}

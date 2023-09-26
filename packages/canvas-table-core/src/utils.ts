import { VectorLike, RectLike, Size } from "./types";

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

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

export function createVector() {
  return { x: 0, y: 0 };
}

export function createSize() {
  return { width: 1, height: 1 };
}

export function createArea() {
  return { x: 0, y: 0, width: 1, height: 1 };
}

import { DEFAULT_COLUMN_WIDTH } from './constants';
import type { ColumnDef } from './types';

export function computeColumnWidths(columnDefs: ColumnDef[]) {
  const columnWidths = [] as number[];
  for (const { width } of columnDefs) {
    columnWidths.push(width ?? DEFAULT_COLUMN_WIDTH);
  }
  return columnWidths;
}

export function getContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not instantiate canvas context');
  }
  return ctx;
}

export function createFontSpecifier(fontFamily: string, fontSize: string, fontStyle: string) {
  return [fontStyle, fontSize, fontFamily].join(' ');
}

export function shallowMerge<T = unknown>(...objs: Record<string, unknown>[]): T {
  const result = {} as Record<string, unknown>;
  for (const obj of objs) {
    if (obj === null || obj === undefined) {
      continue;
    }

    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }
  }
  return result as T;
}

export function shallowMatch(obj1: Record<string, unknown>, ...objs: Record<string, unknown>[]) {
  for (const key of Object.keys(obj1)) {
    for (const obj2 of objs) {
      if (obj1[key] !== undefined && obj1[key] !== obj2[key]) {
        return false;
      }
    }
  }
  return true;
}

export function isEmpty(obj: Record<string, unknown>) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }
  return true;
}

export function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function lerp(
  value: number,
  from_min: number,
  from_max: number,
  to_min: number,
  to_max: number,
) {
  if (value <= from_min) {
    return to_min;
  } else if (value >= from_max) {
    return to_max;
  } else {
    return ((value - from_min) * (to_max - to_min)) / (from_max - from_min) + to_min;
  }
}

export function isPointInRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
) {
  return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}

export function isWhitespace(c: string) {
  return (
    c === ' ' ||
    c === '\n' ||
    c === '\t' ||
    c === '\r' ||
    c === '\f' ||
    c === '\v' ||
    c === '\u00a0' ||
    c === '\u1680' ||
    c === '\u2000' ||
    c === '\u200a' ||
    c === '\u2028' ||
    c === '\u2029' ||
    c === '\u202f' ||
    c === '\u205f' ||
    c === '\u3000' ||
    c === '\ufeff'
  );
}

export function isNumber(val: unknown) {
  return typeof val === 'number';
}

export function isObject(val: unknown) {
  return val != null && val.constructor.name === 'Object';
}

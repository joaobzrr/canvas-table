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

export function shallowMerge<T = unknown>(
  obj1: Record<string, unknown>,
  ...objs: Record<string, unknown>[]
): T {
  const result = obj1;

  for (const obj2 of objs) {
    if (obj2 === null || obj2 === undefined) {
      continue;
    }

    for (const key of Object.keys(obj2)) {
      if (obj2[key] !== undefined) {
        result[key] = obj2[key];
      }
    }
  }
  return result as T;
}

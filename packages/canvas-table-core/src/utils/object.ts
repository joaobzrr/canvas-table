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

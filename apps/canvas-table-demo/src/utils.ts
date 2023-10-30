// Copy of utility function in canvas-table-core
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

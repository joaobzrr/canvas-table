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

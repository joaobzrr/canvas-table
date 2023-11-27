export function shallowMatch(obj1: Record<string, unknown>, obj2: Record<string, unknown>) {
  for (const key of Object.keys(obj1)) {
    if (obj1[key] !== undefined && obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

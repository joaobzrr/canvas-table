export function isObject(val: any) {
  return val != null && val.constructor.name === "Object";
}

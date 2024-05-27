export function isNumber(val: unknown) {
  return typeof val === 'number';
}

export function isObject(val: unknown) {
  return val != null && val.constructor.name === 'Object';
}

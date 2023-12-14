export function isPointInRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}

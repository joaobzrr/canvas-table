import { Rect } from "../types";

export function pathFromRect(rect: Rect) {
  const path = new Path2D();
  path.rect(rect.x, rect.y, rect.width, rect.height);
  return path;
}

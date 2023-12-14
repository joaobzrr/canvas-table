import { Size } from "../types";

export function compareSize(size1: Size, size2: Size) {
  return size1.width === size2.width && size1.height === size2.height;
}

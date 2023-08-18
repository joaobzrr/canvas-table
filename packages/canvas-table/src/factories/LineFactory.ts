import { Line } from "../components/Line";

export class LineFactory {
  private lineImageCache: Map<string, ImageBitmap>;

  constructor() {
    this.lineImageCache = new Map();
  }

  make() {
    return new Line({
      imageCache: this.lineImageCache,
      listening: false
    });
  }

  reset(line: Line) {
    line.position({ x: 0, y: 0 });
    return line;
  }
}

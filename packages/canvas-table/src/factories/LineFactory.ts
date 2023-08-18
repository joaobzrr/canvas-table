import { Line } from "../components/Line";

export class LineFactory {
  constructor() {
  }

  make() {
    return new Line({ listening: false });
  }

  reset(line: Line) {
    line.position({ x: 0, y: 0 });
    return line;
  }
}

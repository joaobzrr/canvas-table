import Konva from "konva";
import { ObjectPool } from "./ObjectPool";
import { BodyCell } from "./BodyCell";
import { HeadCell } from "./HeadCell";
import { Theme } from "./types";

export class NodeManager {
  bodyCellPool: ObjectPool<BodyCell>;
  headCellPool: ObjectPool<HeadCell>;
  linePool: ObjectPool<Konva.Line>;

  theme: Theme;

  constructor(theme: Theme) {
    this.theme = theme;

    this.bodyCellPool = new ObjectPool({
      initialSize: 1000,
      make: () => new BodyCell({ theme: this.theme })
    });

    this.headCellPool = new ObjectPool({
      initialSize: 20,
      make: () => new HeadCell({ theme: this.theme })
    });

    this.linePool = new ObjectPool({
      initialSize: 300,
      make: () => new Konva.Line({ listening: false })
    });
  }

  public borrowBodyCell() {
    return this.bodyCellPool.borrow();
  }

  public retrieveBodyCell(bodyCell: BodyCell) {
    this.bodyCellPool.retrieve(bodyCell);
  }

  public retrieveAllBodyCells() {
    this.bodyCellPool.retrieveAll();
  }

  public borrowHeadCell() {
    return this.headCellPool.borrow();
  }

  public retrieveHeadCell(headCell: HeadCell) {
    this.headCellPool.retrieve(headCell);
  }

  public retrieveAllHeadCells() {
    this.headCellPool.retrieveAll();
  }

  public borrowLine() {
    return this.linePool.borrow();
  }

  public retrieveLine(line: Konva.Line) {
    this.linePool.retrieve(line);
  }

  public retrieveAllLines() {
    this.linePool.retrieveAll();
  }
}

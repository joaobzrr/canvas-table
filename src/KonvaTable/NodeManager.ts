import { ObjectPool } from "./ObjectPool";
import { BodyCell } from "./BodyCell";
import { HeadCell } from "./HeadCell";
import { Theme } from "./types";

export class NodeManager {
  bodyCellPool: ObjectPool<BodyCell>;
  headCellPool: ObjectPool<HeadCell>;
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
    return this.headCellPool.retrieve(headCell);
  }

  public retrieveAllHeadCells() {
    return this.headCellPool.retrieveAll();
  }
}

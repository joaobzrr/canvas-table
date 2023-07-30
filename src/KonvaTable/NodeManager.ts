import { ObjectPool } from "./ObjectPool";
import { BodyCell } from "./BodyCell";
import { HeadCell } from "./HeadCell";
import { Line } from "./Line";
import { Theme } from "./types";

export class NodeManager {
  bodyCellPool: ObjectPool<BodyCell>;
  headCellPool: ObjectPool<HeadCell>;

  lineImageCache: Map<string, ImageBitmap>;
  linePool: ObjectPool<Line>;

  theme: Theme;

  constructor(theme: Theme) {
    this.theme = theme;

    this.bodyCellPool = new ObjectPool({
      initialSize: 1000,
      make: () => new BodyCell({ theme: this.theme }),
      reset: (cell: BodyCell) => {
	cell.position({ x: 0, y: 0 });
	return cell;
      }
    });

    this.headCellPool = new ObjectPool({
      initialSize: 20,
      make: () => new HeadCell({ theme: this.theme })
    });

    this.lineImageCache = new Map();

    this.linePool = new ObjectPool({
      initialSize: 300,
      make: () => new Line({
	imageCache: this.lineImageCache,
	listening: false
      }),
      reset: (line: Line) => {
	line.position({ x: 0, y: 0 });
	return line;
      }
    });
  }

  public borrow(type: "bodyCell"): BodyCell;
  public borrow(type: "headCell"): HeadCell;
  public borrow(type: "line"): Line;
  public borrow(type: string): any {
    switch (type) {
      case "bodyCell": {
	return this.bodyCellPool.borrow();
      }
      case "headCell": {
	return this.headCellPool.borrow();
      }
      case "line": {
	return this.linePool.borrow();
      }
      default: {
	throw new Error(`Unknown node type "${type}"`);
      }
    }
  }

  public retrieve(type: "bodyCell", ...elements: BodyCell[]): void;
  public retrieve(type: "headCell", ...elements: HeadCell[]): void;
  public retrieve(type: "line", ...elements: Line[]): void;
  public retrieve(type: string, ...elements: any[]) {
    switch (type) {
      case "bodyCell": {
	this.bodyCellPool.retrieve(...elements);
      } break;
      case "headCell": {
	this.headCellPool.retrieve(...elements);
      } break;
      case "line": {
	this.linePool.retrieve(...elements);
      } break;
      default: {
	throw new Error(`Unknown node type "${type}"`);
      }
    }
  }
}

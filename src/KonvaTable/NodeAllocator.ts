import { ObjectPool } from "./ObjectPool";
import { BodyCell } from "./BodyCell";
import { HeadCell } from "./HeadCell";
import { Line } from "./Line";
import { ColumnResizer } from "./ColumnResizer";
import { Theme } from "./types";

export class NodeAllocator {
  bodyCellPool: ObjectPool<BodyCell>;
  headCellPool: ObjectPool<HeadCell>;
  columnResizerPool: ObjectPool<ColumnResizer>;

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
      make: () => new HeadCell({ theme: this.theme }),
      reset: (cell: HeadCell) => {
	cell.position({ x: 0, y: 0 });
	return cell;
      }
    });

    this.columnResizerPool = new ObjectPool({
      initialSize: 20,
      make: () => new ColumnResizer({
	height: this.theme.rowHeight
      }),
      reset: (resizer: ColumnResizer) => {
	resizer.position({ x: 0, y: 0 });
	return resizer;
      }
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

  public allocate(type: "bodyCell"): BodyCell;
  public allocate(type: "headCell"): HeadCell;
  public allocate(type: "line"): Line;
  public allocate(type: "columnResizer"): ColumnResizer;
  public allocate(type: string): any {
    switch (type) {
      case "bodyCell": {
	return this.bodyCellPool.allocate();
      }
      case "headCell": {
	return this.headCellPool.allocate();
      }
      case "line": {
	return this.linePool.allocate();
      }
      case "columnResizer": {
	return this.columnResizerPool.allocate();
      }
      default: {
	throw new Error(`Unknown node type "${type}"`);
      }
    }
  }

  public free(type: "bodyCell", ...elements: BodyCell[]): void;
  public free(type: "headCell", ...elements: HeadCell[]): void;
  public free(type: "line", ...elements: Line[]): void;
  public free(type: "columnResizer", ...elements: ColumnResizer[]): void;
  public free(type: string, ...elements: any[]) {
    switch (type) {
      case "bodyCell": {
	this.bodyCellPool.free(...elements);
      } break;
      case "headCell": {
	this.headCellPool.free(...elements);
      } break;
      case "line": {
	this.linePool.free(...elements);
      } break;
      case "columnResizer": {
	this.columnResizerPool.free(...elements);
      } break;
      default: {
	throw new Error(`Unknown node type "${type}"`);
      }
    }
  }
}

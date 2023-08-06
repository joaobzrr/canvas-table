import { ObjectPool } from "./ObjectPool";
import { BodyCell, HeadCell, Line, ResizeColumnButton } from "../components";
import { Theme } from "../types";

export class NodeAllocator {
  bodyCellPool: ObjectPool<BodyCell>;
  headCellPool: ObjectPool<HeadCell>;
  resizeColumnButtonPool: ObjectPool<ResizeColumnButton>;

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

    this.resizeColumnButtonPool = new ObjectPool({
      initialSize: 20,
      make: () => new ResizeColumnButton({
	height: this.theme.rowHeight
      }),
      reset: (button: ResizeColumnButton) => {
	button.position({ x: 0, y: 0 });
	return button;
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
  public allocate(type: "resizeColumnButton"): ResizeColumnButton;
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
      case "resizeColumnButton": {
	return this.resizeColumnButtonPool.allocate();
      }
      default: {
	throw new Error(`Unknown node type "${type}"`);
      }
    }
  }

  public free(type: "bodyCell", ...elements: BodyCell[]): void;
  public free(type: "headCell", ...elements: HeadCell[]): void;
  public free(type: "line", ...elements: Line[]): void;
  public free(type: "resizeColumnButton", ...elements: ResizeColumnButton[]): void;
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
      case "resizeColumnButton": {
	this.resizeColumnButtonPool.free(...elements);
      } break;
      default: {
	throw new Error(`Unknown node type "${type}"`);
      }
    }
  }
}

import Konva from "konva";
import { Theme } from "../types";
import { BodyCell, HeadCell, Line, ResizeColumnButton } from "../components";
import { ObjectPool } from "./ObjectPool";
import { BodyCellFactory } from "./BodyCellFactory";
import { HeadCellFactory } from "./HeadCellFactory";
import { ResizeColumnButtonFactory } from "./ResizeColumnButtonFactory";

export class NodeAllocator {
  bodyCellFactory: BodyCellFactory;
  bodyCellPool: ObjectPool<Konva.Group>;

  headCellFactory: HeadCellFactory;
  headCellPool: ObjectPool<Konva.Group>;

  resizeColumnButtonFactory: ResizeColumnButtonFactory;
  resizeColumnButtonPool: ObjectPool<Konva.Rect>;

  lineImageCache: Map<string, ImageBitmap>;
  linePool: ObjectPool<Line>;

  theme: Theme;

  constructor(theme: Theme) {
    this.theme = theme;

    this.bodyCellFactory = new BodyCellFactory(this.theme);
    this.bodyCellPool = new ObjectPool({
      initialSize: 1000,
      make: () => this.bodyCellFactory.make(),
      reset: group => this.bodyCellFactory.reset(group)
    });

    this.headCellFactory = new HeadCellFactory(this.theme);
    this.headCellPool = new ObjectPool({
      initialSize: 30,
      make: () => this.headCellFactory.make(),
      reset: (group) => this.headCellFactory.reset(group)
    });

    this.resizeColumnButtonFactory = new ResizeColumnButtonFactory(this.theme);
    this.resizeColumnButtonPool = new ObjectPool({
      initialSize: 30,
      make: () => this.resizeColumnButtonFactory.make(),
      reset: rect => this.resizeColumnButtonFactory.reset(rect)
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

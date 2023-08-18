import Konva from "konva";
import { TextRenderer } from "text-renderer";
import { ObjectPool } from "./ObjectPool";
import { Line } from "../components";
import {
  BodyCellFactory,
  HeadCellFactory,
  ResizeColumnButtonFactory,
  LineFactory
} from "../factories";
import { Theme } from "../types";

export class NodeAllocator {
  bodyCellFactory: BodyCellFactory;
  bodyCellPool: ObjectPool<Konva.Group>;

  headCellFactory: HeadCellFactory;
  headCellPool: ObjectPool<Konva.Group>;

  resizeColumnButtonFactory: ResizeColumnButtonFactory;
  resizeColumnButtonPool: ObjectPool<Konva.Rect>;

  lineFactory: LineFactory;
  linePool: ObjectPool<Line>;

  textRenderer: TextRenderer;

  theme: Theme;

  constructor(theme: Theme) {
    this.theme = theme;

    this.textRenderer = new TextRenderer();

    this.bodyCellFactory = new BodyCellFactory(this.textRenderer, this.theme);
    this.bodyCellPool = new ObjectPool({
      initialSize: 1000,
      factory: this.bodyCellFactory
    });

    this.headCellFactory = new HeadCellFactory(this.textRenderer, this.theme);
    this.headCellPool = new ObjectPool({
      initialSize: 30,
      factory: this.headCellFactory
    });

    this.resizeColumnButtonFactory = new ResizeColumnButtonFactory(this.theme);
    this.resizeColumnButtonPool = new ObjectPool({
      initialSize: 30,
      factory: this.resizeColumnButtonFactory
    });

    this.lineFactory = new LineFactory();

    this.linePool = new ObjectPool({
      initialSize: 300,
      factory: this.lineFactory
    });
  }

  public allocate(type: "bodyCell"): Konva.Group;
  public allocate(type: "headCell"): Konva.Group;
  public allocate(type: "line"): Line;
  public allocate(type: "resizeColumnButton"): Konva.Rect;
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

  public free(type: "bodyCell", ...elements: Konva.Group[]): void;
  public free(type: "headCell", ...elements: Konva.Group[]): void;
  public free(type: "line", ...elements: Line[]): void;
  public free(type: "resizeColumnButton", ...elements: Konva.Rect[]): void;
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

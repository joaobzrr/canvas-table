import Konva from "konva";
import { TableState } from "./TableState";
import { LRUCache } from "./LRUCache";
import { Utils } from "./Utils";
import { LineProps, Theme } from "./types";

type NodeManagerOptions = {
  tableState: TableState;
  theme:      Theme;
}

export class NodeManager {
  tableState: TableState;
  theme:      Theme;

  nodeCache:  LRUCache<Konva.Node>;
  imageCache: LRUCache<HTMLImageElement>;

  constructor(options: NodeManagerOptions) {
    this.tableState = options.tableState;
    this.theme      = options.theme;

    this.nodeCache  = new LRUCache(65536);
    this.imageCache = new LRUCache(100);
  }

  getBodyCell(rowIndex: number, colIndex: number) {
    const key = `body-cell-${rowIndex}-${colIndex}`;
    let cell = this.nodeCache.get<Konva.Group>(key);
    if (cell) return cell;

    cell = new Konva.Group({ row: rowIndex, col: colIndex, name: key });

    const columnState = this.tableState.getColumnState(colIndex);
    const rowHeight   = this.tableState.getRowHeight();

    const text = new Konva.Text({
      x: this.theme.cellPadding,
      width: columnState.width - this.theme.cellPadding * 2,
      height: rowHeight,
      fontSize: this.theme.fontSize,
      fontFamily: this.theme.fontFamily,
      fill: this.theme.fontColor,
      verticalAlign: "middle",
      wrap: "none",
      ellipsis: true,
      listening: false
    });
    cell.add(text);

    this.nodeCache.put(key, cell);

    return cell;
  }

  getHeadCell(colIndex: number) {
    const key = `head-cell-${colIndex}`;
    let cell = this.nodeCache.get<Konva.Group>(key);
    if (cell) return cell;

    cell = new Konva.Group({ col: colIndex, name: key });

    const columnState = this.tableState.getColumnState(colIndex);
    const rowHeight   = this.tableState.getRowHeight();

    cell.add(new Konva.Text({
      x: this.theme.cellPadding,
      width: columnState.width - this.theme.cellPadding * 2,
      height: rowHeight,
      fontSize: this.theme.fontSize,
      fontFamily: this.theme.fontFamily,
      fontStyle: "bold",
      fill: this.theme.fontColor,
      verticalAlign: "middle",
      wrap: "none",
      ellipsis: true,
      listening: false
    }));

    this.nodeCache.put(key, cell);

    return cell;
  }

  getLine(props: LineProps) {
    const image = this.getLineImage(props);

    let line = this.nodeCache.get<Konva.Image>(props.key);
    if (!line) {
      line = new Konva.Image({ image });
      this.nodeCache.put(props.key, line);
      return line;
    } else {
      line.image(image);
      return line;
    }
  }

  getLineImage(props: LineProps) {
    const { type, length, thickness, color } = props;

    const imageKey =
      `type=${type},length=${length},thickness=${thickness},color=${color}`;

    let image = this.imageCache.get(imageKey);
    if (!image) {
      image = Utils.drawNonAntialiasedLine(props);
    }

    this.imageCache.put(imageKey, image);
    return image;
  }
}

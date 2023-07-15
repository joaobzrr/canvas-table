import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Head } from "./Head";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { VerticalScrollbar } from "./VerticalScrollbar";
import { TableState } from "./TableState";
import { Vector } from "./Vector";
import { KonvaTableOptions, ColumnDef, Dimensions, LineProps } from "./types";
import { Utils } from "./Utils";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  body:     Konva.Group;
  bodyGrid: Konva.Group;

  lineImageCache: Map<string, HTMLCanvasElement>;

  head: Head;

  hsb: HorizontalScrollbar;
  vsb: VerticalScrollbar;

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.tableState = new TableState();

    const { theme } = this.tableState;

    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    this.body = new Konva.Group();
    this.layer.add(this.body);

    this.bodyGrid = new Konva.Group({ y: theme.rowHeight });
    this.body.add(this.bodyGrid);

    this.lineImageCache = new Map();

    this.head = new Head({
      tableState: this.tableState,
      height: theme.rowHeight
    });
//    this.layer.add(this.head);

    this.hsb = new HorizontalScrollbar({ tableState: this.tableState });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState: this.tableState,
      y: theme.rowHeight
    });
    this.layer.add(this.vsb);

    this.stage.on("wheel", this.onWheel.bind(this));
  }

  onWheel(event: KonvaEventObject<WheelEvent>) {
    const { x: scrollLeft, y: scrollTop } = this.tableState.scrollPosition;

    const newScrollLeft = new Vector({
      x: Math.round(scrollLeft + event.evt.deltaX),
      y: Math.round(scrollTop  + event.evt.deltaY)
    });

    this.tableState.setScrollPosition(newScrollLeft);

    this.updateGrid();

    this.head.onWheel();
    this.hsb.onWheel();
    this.vsb.onWheel();
  }

  setStageDimensions(stageDimensions: Dimensions) {
    this.stage.size(stageDimensions);

    const { width: stageWidth, height: stageHeight } = stageDimensions;

    const { width: tableWidth, height: tableHeight } = this.tableState.tableDimensions;
    const { theme } = this.tableState;

    const bodyWidthWithoutOverflow = stageWidth;
    const bodyWidthWithOverflow = bodyWidthWithoutOverflow - theme.scrollBarThickness;

    const bodyHeightWithoutOverflow = stageHeight - theme.rowHeight;
    const bodyHeightWithOverflow = bodyHeightWithoutOverflow - theme.scrollBarThickness;

    const hsbIsVisible = bodyHeightWithOverflow < tableHeight;
    const bodyWidth = hsbIsVisible ? bodyWidthWithOverflow : bodyWidthWithoutOverflow;

    const vsbIsVisible = bodyWidthWithOverflow < tableWidth;
    const bodyHeight = vsbIsVisible ? bodyHeightWithOverflow : bodyHeightWithoutOverflow;

    this.tableState.setViewportDimensions({ width: bodyWidth, height: bodyHeight });

    this.body.size({ width: bodyWidth, height: bodyHeight });

    this.head.width(bodyWidth);

    this.hsb.setAttrs({
      y: stageHeight - theme.scrollBarThickness,
      width: bodyWidth,
      visible: hsbIsVisible
    });

    this.vsb.setAttrs({ x: bodyWidth,
      height: bodyHeight,
      visible: vsbIsVisible
    });

    // @Todo: Call this only when table ranges change
    this.updateGrid();
  }

  updateGrid() {
    this.bodyGrid.removeChildren();

    const { x: scrollLeft, y: scrollTop   } = this.tableState.scrollPosition;
    const { width: tableWidth, height: tableHeight } = this.tableState.tableDimensions;
    const { columnLeft, columnRight, rowTop, rowBottom } = this.tableState.tableRanges;
    const theme = this.tableState.theme;

    const hLineLength = Math.min(this.body.width(), tableWidth);

    for (let i = rowTop + 1; i < rowBottom; i++) {
      const canvas = this.getLine({
        type: "hline",
        length: hLineLength,
        thickness: 1,
        color: "#000000"
      });

      this.bodyGrid.add(new Konva.Image({
        image: canvas,
        x: 0,
        y: i * theme.rowHeight - scrollTop,
        width: canvas.width,
        height: canvas.height
      }));
    }

    const vLineLength = Math.min(this.body.height(), tableHeight);

    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);

      const canvas = this.getLine({
        type: "vline",
        length: vLineLength,
        thickness: 1,
        color: "#000000"
      });

      this.bodyGrid.add(new Konva.Image({
        image: canvas,
        x: columnState.position - scrollLeft,
        y: 0,
        width: canvas.width,
        height: canvas.height
      }));
    }
  }

  getLine(props: LineProps) {
    const { type, length, thickness, color } = props;

    const key = `type=${type}, length=${length}, thickness=${thickness}, color=${color}`;
    let canvas = this.lineImageCache.get(key);
    if (canvas) return canvas;

    canvas = Utils.drawNonAntialiasedLine(props);
    this.lineImageCache.set(key, canvas);

    return canvas;
  }

  columnDefsToColumnStates(columnDefs: ColumnDef[]) {
    const result = [];
    let total = 0;

    for (const columnDef of columnDefs) {
      result.push({ ...columnDef, position: total });
      total += columnDef.width;
    }

    return result;
  }
}

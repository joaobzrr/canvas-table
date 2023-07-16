import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
// import { Head } from "./Head";
// import { HorizontalScrollbar } from "./HorizontalScrollbar";
// import { VerticalScrollbar } from "./VerticalScrollbar";
import { TableState } from "./TableState";
import { Vector } from "./Vector";
import { Utils } from "./Utils";
import { defaultTheme } from "./defaultTheme";
import {
  KonvaTableOptions,
  ColumnDef,
  Dimensions,
  LineProps,
  Theme
} from "./types";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  head:          Konva.Group;
  headGrid:      Konva.Group;
  headCells:     Konva.Group;
  headCellCache: Map<string, Konva.Group>;

  body:          Konva.Group;
  bodyGrid:      Konva.Group;
  bodyCells:     Konva.Group;
  bodyCellCache: Map<string, Konva.Group>;

  lineImageCache: Map<string, HTMLImageElement>;

  // head: Head;

  // hsb: HorizontalScrollbar;
  // vsb: VerticalScrollbar;

  theme: Theme;

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer({ listening: false });
    this.stage.add(this.layer);

    this.theme = defaultTheme;

    this.tableState = new TableState();
    this.tableState.setRowHeight(defaultTheme.rowHeight);

    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    this.head = new Konva.Group({ height: this.theme.rowHeight });
    this.layer.add(this.head);

    this.headGrid = new Konva.Group();
    this.head.add(this.headGrid);

    this.headCells = new Konva.Group();
    this.head.add(this.headCells);

    this.headCellCache = new Map();

    this.body = new Konva.Group({ y: this.theme.rowHeight });
    this.layer.add(this.body);

    this.bodyGrid = new Konva.Group();
    this.body.add(this.bodyGrid);

    this.bodyCells = new Konva.Group();
    this.body.add(this.bodyCells);

    this.bodyCellCache = new Map();

    this.lineImageCache = new Map();

    // this.head = new Head({
    //   tableState: this.tableState,
    //   height: this.theme.rowHeight
    // });
    // this.layer.add(this.head);

    // this.hsb = new HorizontalScrollbar({ tableState: this.tableState });
    // this.layer.add(this.hsb);

    // this.vsb = new VerticalScrollbar({
    //   tableState: this.tableState,
    //   y: this.theme.rowHeight
    // });
    // this.layer.add(this.vsb);

    this.stage.on("wheel", this.onWheel.bind(this));
  }

  onWheel(event: KonvaEventObject<WheelEvent>) {
    const { x: scrollLeft, y: scrollTop } = this.tableState.scrollPosition;

    const newScrollLeft = new Vector({
      x: Math.round(scrollLeft + event.evt.deltaX),
      y: Math.round(scrollTop  + event.evt.deltaY)
    });

    this.tableState.setScrollPosition(newScrollLeft);

    this.updateBodyGrid();
    this.updateBodyCells();

    this.updateHeadCells();

    // this.head.onWheel();
    // this.hsb.onWheel();
    // this.vsb.onWheel();
  }

  setStageDimensions(stageDimensions: Dimensions) {
    this.stage.size(stageDimensions);

    const { width: stageWidth, height: stageHeight } = stageDimensions;

    const { width: tableWidth, height: tableHeight } = this.tableState.tableDimensions;

    const bodyWidthWithoutOverflow = stageWidth;
    const bodyWidthWithOverflow = bodyWidthWithoutOverflow - this.theme.scrollBarThickness;

    const bodyHeightWithoutOverflow = stageHeight - this.theme.rowHeight;
    const bodyHeightWithOverflow = bodyHeightWithoutOverflow - this.theme.scrollBarThickness;

    const hsbIsVisible = bodyHeightWithOverflow < tableHeight;
    const bodyWidth = hsbIsVisible ? bodyWidthWithOverflow : bodyWidthWithoutOverflow;

    const vsbIsVisible = bodyWidthWithOverflow < tableWidth;
    const bodyHeight = vsbIsVisible ? bodyHeightWithOverflow : bodyHeightWithoutOverflow;

    this.tableState.setViewportDimensions({ width: bodyWidth, height: bodyHeight });

    this.body.size({ width: bodyWidth, height: bodyHeight });

    // this.head.width(bodyWidth);

    // this.hsb.setAttrs({
    //   y: stageHeight - this.theme.scrollBarThickness,
    //   width: bodyWidth,
    //   visible: hsbIsVisible
    // });

    // this.vsb.setAttrs({ x: bodyWidth,
    //   height: bodyHeight,
    //   visible: vsbIsVisible
    // });

    this.updateBodyGrid();
    this.updateBodyCells();
    this.updateHeadCells();
  }

  updateBodyGrid() {
    const scrollPosition  = this.tableState.getScrollPosition();
    const tableDimensions = this.tableState.getTableDimensions();
    const tableRanges     = this.tableState.getTableRanges();

    this.bodyGrid.removeChildren();

    const hLineLength = Math.min(this.body.width(), tableDimensions.width);

    for (let i = tableRanges.rowTop + 1; i < tableRanges.rowBottom; i++) {
      const canvas = this.getLine({
        type: "hline",
        length: hLineLength,
        thickness: 1,
        color: "#000000"
      });

      this.bodyGrid.add(new Konva.Image({
        image: canvas,
        x: 0,
        y: i * this.theme.rowHeight - scrollPosition.y,
        width: canvas.width,
        height: canvas.height
      }));
    }

    const vLineLength = Math.min(this.body.height(), tableDimensions.height);

    for (let j = tableRanges.columnLeft + 1; j < tableRanges.columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);

      const canvas = this.getLine({
        type: "vline",
        length: vLineLength,
        thickness: 1,
        color: "#000000"
      });

      this.bodyGrid.add(new Konva.Image({
        image: canvas,
        x: columnState.position - scrollPosition.x,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      }));
    }
  }

  updateBodyCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges    = this.tableState.getTableRanges();
    const rowHeight      = this.tableState.getRowHeight();

    this.bodyCells.removeChildren();

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;
    for (let rowIndex = rowTop; rowIndex < rowBottom; rowIndex++) {
      const dataRow = this.tableState.getDataRow(rowIndex);
      const y = rowIndex * rowHeight - scrollPosition.y;

      for (let colIndex = columnLeft; colIndex < columnRight; colIndex++) {
        const columnState = this.tableState.getColumnState(colIndex);
        const x = columnState.position - scrollPosition.x;

        const cell = this.getBodyCell(rowIndex, colIndex);
        if (!cell.parent) {
          this.bodyCells.add(cell);
        }

        cell.setPosition({ x, y });

        const text = cell.findOne("Text") as Konva.Text;
        text.text(dataRow[columnState.field]);
      }
    }
  }

  updateHeadCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges    = this.tableState.getTableRanges();

    this.headCells.removeChildren();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const cell = this.getHeadCell(j);
      if (!cell.parent) {
        this.headCells.add(cell);
      }

      cell.x(x);

      const text = cell.findOne("Text") as Konva.Text;
      text.text(columnState.title);
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

  getBodyCell(rowIndex: number, colIndex: number) {
    const key = `body-cell-${rowIndex}-${colIndex}`;
    let cell = this.bodyCellCache.get(key);
    if (cell) return cell;

    cell = new Konva.Group({ row: rowIndex, col: colIndex, name: key });

    const columnState = this.tableState.getColumnState(colIndex);
    const rowHeight   = this.tableState.getRowHeight();

    cell.add(new Konva.Text({
      x: this.theme.cellPadding,
      width: columnState.width - this.theme.cellPadding * 2,
      height: rowHeight,
      fontSize: this.theme.fontSize,
      fontFamily: this.theme.fontFamily,
      fill: this.theme.fontColor,
      verticalAlign: "middle",
      wrap: "none",
      ellipsis: true,
    }));

    this.bodyCellCache.set(key, cell);

    return cell;
  }

  getHeadCell(colIndex: number) {
    const key = `head-cell-${colIndex}`;
    let cell = this.headCellCache.get(key);
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
      fill: this.theme.fontColor,
      verticalAlign: "middle",
      wrap: "none",
      ellipsis: true,
    }));

    this.headCellCache.set(key, cell);

    return cell;
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

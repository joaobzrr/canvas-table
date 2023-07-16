import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { VerticalScrollbar } from "./VerticalScrollbar";
import { TableState } from "./TableState";
import { Vector } from "./Vector";
import { defaultTheme } from "./defaultTheme";
import { KonvaTableOptions, ColumnDef, Dimensions, Theme } from "./types";
import { NodeManager } from "./NodeManager";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  body:          Konva.Group;
  bodyGrid:      Konva.Group;
  bodyCells:     Konva.Group;

  head:          Konva.Group;
  headGrid:      Konva.Group;
  headCells:     Konva.Group;

  nodeManager: NodeManager;
  // nodeCache: LRUCache<Konva.Node>;

  hsb: HorizontalScrollbar;
  vsb: VerticalScrollbar;

  theme: Theme;

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.theme = defaultTheme;

    this.tableState = new TableState();
    this.tableState.setRowHeight(defaultTheme.rowHeight);

    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    this.body = new Konva.Group({ y: this.theme.rowHeight });
    this.layer.add(this.body);

    this.bodyGrid = new Konva.Group();
    this.body.add(this.bodyGrid);

    this.bodyCells = new Konva.Group();
    this.body.add(this.bodyCells);

    this.head = new Konva.Group({ height: this.theme.rowHeight });
    this.layer.add(this.head);

    this.headGrid = new Konva.Group();
    this.head.add(this.headGrid);

    this.headCells = new Konva.Group();
    this.head.add(this.headCells);

    this.nodeManager = new NodeManager({
      tableState: this.tableState,
      theme:      this.theme
    });

    this.hsb = new HorizontalScrollbar({
      tableState:  this.tableState,
      theme:       this.theme,
      nodeManager: this.nodeManager,
      height:      this.theme.scrollBarThickness
    });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState:  this.tableState,
      theme:       this.theme,
      nodeManager: this.nodeManager,
      width:       this.theme.scrollBarThickness
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

    this.updateBodyGrid();
    this.updateBodyCells();

    this.updateHeadGrid();
    this.updateHeadCells();

    this.hsb.onWheel();
    this.vsb.onWheel();
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
    this.body.clip({ x: 0, y: 0, width: bodyWidth, height: bodyHeight });

    this.head.width(bodyWidth);
    this.head.clip({ x: 0, y: 0, width: this.head.width(), height: this.head.height() });

    this.hsb.setAttrs({
      y: stageHeight - this.theme.scrollBarThickness,
      width: bodyWidth,
      visible: hsbIsVisible
    });

    this.vsb.setAttrs({
      x: bodyWidth,
      height: stageHeight - this.theme.scrollBarThickness,
      visible: vsbIsVisible
    });

    this.updateBodyGrid();
    this.updateBodyCells();

    this.updateHeadGrid();
    this.updateHeadCells();
  }

  updateBodyGrid() {
    const scrollPosition  = this.tableState.getScrollPosition();
    const tableDimensions = this.tableState.getTableDimensions();
    const tableRanges     = this.tableState.getTableRanges();

    this.bodyGrid.removeChildren();

    const hLineLength = Math.min(this.body.width(), tableDimensions.width);

    for (let i = tableRanges.rowTop + 1; i < tableRanges.rowBottom; i++) {
      const line = this.nodeManager.getLine({
        type: "horizontal",
        length: hLineLength,
        thickness: 1,
        color: "#000000",
        key: `body-row-line-${i}`
      });
      line.y(i * this.theme.rowHeight - scrollPosition.y);
      this.bodyGrid.add(line);
    }

    const vLineLength = Math.min(this.body.height(), tableDimensions.height);

    for (let j = tableRanges.columnLeft + 1; j < tableRanges.columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);

      const line = this.nodeManager.getLine({
        type: "vertical",
        length: vLineLength,
        thickness: 1,
        color: "#000000",
        key: `body-col-line-${j}`
      });
      line.x(columnState.position - scrollPosition.x);
      this.bodyGrid.add(line);
    }

    const topBorder = this.nodeManager.getLine({
      type: "horizontal",
      length: hLineLength,
      thickness: 1,
      color: "#000000",
      key: "body-top-border"
    });
    this.bodyGrid.add(topBorder);
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

        const cell = this.nodeManager.getBodyCell(rowIndex, colIndex);
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

      const cell = this.nodeManager.getHeadCell(j);
      if (!cell.parent) {
        this.headCells.add(cell);
      }

      cell.x(x);

      const text = cell.findOne("Text") as Konva.Text;
      text.text(columnState.title);
    }
  }

  updateHeadGrid() {
    const scrollPosition  = this.tableState.getScrollPosition();
    const tableRanges     = this.tableState.getTableRanges();

    this.headGrid.removeChildren();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);

      const line = this.nodeManager.getLine({
        type: "vertical",
        length: this.theme.rowHeight,
        thickness: 1,
        color: "#000000",
        key: `head-col-line-${j}`
      });
      line.x(columnState.position - scrollPosition.x);
      this.headGrid.add(line);
    }
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

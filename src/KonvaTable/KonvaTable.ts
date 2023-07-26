import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { throttle } from "lodash";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { VerticalScrollbar } from "./VerticalScrollbar";
import { Text } from "./Text";
import { TableState } from "./TableState";
import { GlyphAtlas } from "./GlyphAtlas";
import { Vector } from "./Vector";
import { defaultTheme } from "./defaultTheme";
import { KonvaTableOptions, ColumnDef, Dimensions, Theme } from "./types";
import { NodeManager } from "./NodeManager";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;
  theme: Theme;

  body:     Konva.Group;
  bodyGrid: Konva.Group;

  bodyCellGroup: Konva.Group;

  head:      Konva.Group;
  headGrid:  Konva.Group;

  headCellGroup: Konva.Group;

  poolManager: NodeManager;

  hsb: HorizontalScrollbar;
  vsb: VerticalScrollbar;

  constructor(options: KonvaTableOptions & { glyphAtlas: GlyphAtlas }) {
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

    this.bodyCellGroup = new Konva.Group();
    this.body.add(this.bodyCellGroup);

    this.head = new Konva.Group({ height: this.theme.rowHeight });
    this.layer.add(this.head);

    this.headGrid = new Konva.Group();
    this.head.add(this.headGrid);

    this.headCellGroup = new Konva.Group();
    this.head.add(this.headCellGroup);

    this.poolManager = new NodeManager(this.theme);

    this.hsb = new HorizontalScrollbar({
      tableState:  this.tableState,
      theme:       this.theme,
      height:      this.theme.scrollBarThickness
    });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState:  this.tableState,
      theme:       this.theme,
      width:       this.theme.scrollBarThickness
    });
    this.layer.add(this.vsb);

    this.stage.on("wheel", throttle((event => this.onWheel(event)), 16));
  }

  static async create(options: KonvaTableOptions) {
    const theme = options?.theme ?? defaultTheme;
    GlyphAtlas.theme = theme;
    Text.theme = theme;

    const { fontFamily, fontSize } = theme;
    const glyphAtlas = await GlyphAtlas.create(fontFamily, fontSize);

    Text.glyphAtlas = glyphAtlas;

    return new KonvaTable({ ...options, glyphAtlas });
  }

  onWheel(event: KonvaEventObject<WheelEvent>) {
    const { x: scrollLeft, y: scrollTop } = this.tableState.scrollPosition;

    const newScrollLeft = new Vector({
      x: Math.round(scrollLeft + event.evt.deltaX),
      y: Math.round(scrollTop  + event.evt.deltaY)
    });

    this.tableState.setScrollPosition(newScrollLeft);

    //this.updateBodyGrid();
    this.updateBodyCells();

    //this.updateHeadGrid();
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

    //this.updateBodyGrid();
    this.updateBodyCells();

    //this.updateHeadGrid();
    this.updateHeadCells();
  }

  /*
  updateBodyGrid() {
    const scrollPosition     = this.tableState.getScrollPosition();
    const tableDimensions    = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges        = this.tableState.getTableRanges();

    this.bodyGrid.removeChildren();

    const hLineLength = Math.min(this.body.width(), tableDimensions.width);

    for (let i = tableRanges.rowTop + 1; i < tableRanges.rowBottom; i++) {
      const line = this.hLinePool.getOne();
      line.setAttrs({
	y: i * this.theme.rowHeight - scrollPosition.y,
        length: hLineLength,
        thickness: 1,
        color: this.theme.tableBorderColor,
      });
      this.bodyGrid.add(line);
    }

    if (viewportDimensions.height > tableDimensions.height) {
      const line = this.vLinePool.getOne();
      line.setAttrs({
	y: tableDimensions.height,
        length: hLineLength,
        thickness: 1,
        color: this.theme.tableBorderColor,
      });
      this.bodyGrid.add(line);
    }

    const vLineLength = Math.min(this.body.height(), tableDimensions.height);

    for (let j = tableRanges.columnLeft + 1; j < tableRanges.columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);

      const line = this.vLinePool.getOne();
      line.setAttrs({
	x: columnState.position - scrollPosition.x,
        length: vLineLength,
        thickness: 1,
        color: this.theme.tableBorderColor,
      });
      this.bodyGrid.add(line);
    }

    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.vLinePool.getOne()
      line.setAttrs({
	x: tableDimensions.width,
        length: vLineLength,
        thickness: 1,
        color: this.theme.tableBorderColor,
      });
      this.bodyGrid.add(line);
    }

    {
      const line = this.hLinePool.getOne();
      line.setAttrs({
	length: hLineLength,
	thickness: 1,
	color: this.theme.tableBorderColor,
      });
      this.bodyGrid.add(line);
    }
  }
  */

  updateBodyCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges    = this.tableState.getTableRanges();
    const rowHeight      = this.tableState.getRowHeight();

    this.poolManager.retrieveAllBodyCells();
    this.bodyCellGroup.removeChildren();

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;
    for (let rowIndex = rowTop; rowIndex < rowBottom; rowIndex++) {
      const dataRow = this.tableState.getDataRow(rowIndex);
      const y = rowIndex * rowHeight - scrollPosition.y;

      for (let colIndex = columnLeft; colIndex < columnRight; colIndex++) {
        const columnState = this.tableState.getColumnState(colIndex);
        const x = columnState.position - scrollPosition.x;

        const cell = this.poolManager.borrowBodyCell();
	if (!cell.parent) {
          this.bodyCellGroup.add(cell);
        }

	cell.setAttrs(({
	  x, y,
	  width: columnState.width,
	  height: rowHeight,
	  text: dataRow[columnState.field],
	  theme: this.theme
	}));
      }
    }
  }

  updateHeadCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges    = this.tableState.getTableRanges();
    const rowHeight      = this.tableState.getRowHeight();

    this.poolManager.retrieveAllHeadCells();
    this.headCellGroup.removeChildren();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const cell = this.poolManager.borrowHeadCell();
      if (!cell.parent) {
        this.headCellGroup.add(cell);
      }

      cell.setAttrs({
	x,
	width: columnState.width,
	height: rowHeight,
	text: columnState.title,
	theme: this.theme,
      });
    }
  }

  /*
  updateHeadGrid() {
    const scrollPosition     = this.tableState.getScrollPosition();
    const tableDimensions    = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges        = this.tableState.getTableRanges();

    this.headGrid.removeChildren();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);

      const line = this.nodeManager.getLine({
        type: "vertical",
        length: this.theme.rowHeight,
        thickness: 1,
        color: this.theme.tableBorderColor,
        key: `head-col-line-${j}`
      });
      line.x(columnState.position - scrollPosition.x);
      this.headGrid.add(line);
    }

    if (viewportDimensions.width > tableDimensions.width) {
      const rightBorder = this.nodeManager.getLine({
        type: "vertical",
        length: this.theme.rowHeight,
        thickness: 1,
        color: this.theme.tableBorderColor,
        key: "table-right-border"
      });
      rightBorder.x(tableDimensions.width);
      this.headGrid.add(rightBorder);
    }
  }
  */

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

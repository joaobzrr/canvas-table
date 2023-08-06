import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { throttle } from "lodash";
import { BodyCell } from "./BodyCell";
import { HeadCell } from "./HeadCell";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { VerticalScrollbar } from "./VerticalScrollbar";
import { Text } from "./Text";
import { Line } from "./Line";
import { ResizeColumnButton } from "./ResizeColumnButton";
import { ResizeColumnDraggable } from "./ResizeColumnDraggable";
import { TableState } from "./TableState";
import { GlyphAtlas } from "./GlyphAtlas";
import { NodeAllocator } from "./NodeAllocator";
import { Vector } from "./Vector";
import { defaultTheme } from "./defaultTheme";
import { MIN_COLUMN_WIDTH } from "./constants";
import { KonvaTableOptions, Dimensions, Theme } from "./types";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;
  theme: Theme;

  body: Konva.Group;
  bodyLineGroup: Konva.Group;
  bodyCellGroup: Konva.Group;

  head: Konva.Group;
  header: Konva.Group;
  headLineGroup: Konva.Group;
  headCellGroup: Konva.Group;

  resizeColumnButtonGroup: Konva.Group;

  nodeAllocator: NodeAllocator;

  hsb: HorizontalScrollbar;
  hsbIsVisible = false;

  vsb: VerticalScrollbar;
  vsbIsVisible = false;

  constructor(options: KonvaTableOptions & { glyphAtlas: GlyphAtlas }) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.theme = defaultTheme;

    this.tableState = new TableState();
    this.tableState.setRowHeight(defaultTheme.rowHeight);

    this.tableState.setTableData(options.columnDefs, options.dataRows);

    this.body = new Konva.Group({ y: this.theme.rowHeight });
    this.layer.add(this.body);

    this.bodyLineGroup = new Konva.Group();
    this.body.add(this.bodyLineGroup);

    this.bodyCellGroup = new Konva.Group();
    this.body.add(this.bodyCellGroup);

    this.head = new Konva.Group({ height: this.theme.rowHeight });
    this.layer.add(this.head);

    this.header = new Konva.Group({ height: this.theme.rowHeight });
    this.head.add(this.header);

    this.headLineGroup = new Konva.Group();
    this.head.add(this.headLineGroup);

    this.headCellGroup = new Konva.Group();
    this.header.add(this.headCellGroup);

    this.resizeColumnButtonGroup = new Konva.Group();
    this.head.add(this.resizeColumnButtonGroup);

    this.nodeAllocator = new NodeAllocator(this.theme);

    this.hsb = new HorizontalScrollbar({
      tableState: this.tableState,
      nodeAllocator: this.nodeAllocator,
      theme: this.theme,
      y: this.theme.rowHeight,
      height: this.theme.scrollBarThickness
    });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState: this.tableState,
      nodeAllocator: this.nodeAllocator,
      theme: this.theme,
      y: this.theme.rowHeight,
      width: this.theme.scrollBarThickness
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

  setStageDimensions(stageDimensions: Dimensions) {
    this.stage.size(stageDimensions);

    this.resizeBody();
    this.resizeHead();

    this.updateHorizontalScrollbarVisibility();
    const stageHeight = this.stage.height();
    this.hsb.y(stageHeight - this.theme.scrollBarThickness);
    this.hsb.width(this.body.width());

    this.updateVerticalScrollbarVisibility();
    this.vsb.x(this.body.width());
    this.vsb.height(this.body.height());

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();
  }

  onWheel(event: KonvaEventObject<WheelEvent>) {
    const { x: scrollLeft, y: scrollTop } = this.tableState.scrollPosition;

    const newScrollLeft = new Vector({
      x: Math.round(scrollLeft + event.evt.deltaX),
      y: Math.round(scrollTop  + event.evt.deltaY)
    });

    this.tableState.setScrollPosition(newScrollLeft);

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();

    if (this.hsb.parent) {
      this.hsb.repositionThumb();
    }

    if (this.vsb.parent) {
      this.vsb.repositionThumb();
    }
  }

  onClickColumnResizeButton(columnIndex: number, x: number) {
    const columnState = this.tableState.getColumnState(columnIndex);

    const onDragMove = (event: KonvaEventObject<MouseEvent>) => {
      const scrollPosition = this.tableState.getScrollPosition();

      const draggable = event.currentTarget;
      const dragX = draggable.x() + scrollPosition.x;
      const columnWidth = dragX - columnState.position
      this.resizeColumn(columnIndex, columnWidth);
    }

    const rect = new ResizeColumnDraggable({ x, onDragMove });
    this.layer.add(rect);

    rect.startDrag();
  }

  resizeColumn(columnIndex: number, columnWidth: number) {
    this.tableState.setColumnWidth(columnIndex, Math.max(columnWidth, MIN_COLUMN_WIDTH));

    this.resizeHead();
    this.resizeBody();

    this.updateHorizontalScrollbarVisibility();
    if (this.hsbIsVisible) {
      this.hsb.updateThumb();
      this.hsb.repositionThumb();
    }

    this.updateVerticalScrollbarVisibility();
    if (this.vsbIsVisible) {
      this.vsb.updateThumb();
      this.hsb.repositionThumb();
    }

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();
  }

  resizeBody() {
    const { width: stageWidth, height: stageHeight } = this.stage.size();

    const { width: tableWidth, height: tableHeight } = this.tableState.tableDimensions;

    const bodyWidthWithoutOverflow = stageWidth;
    const bodyWidthWithOverflow = bodyWidthWithoutOverflow - this.theme.scrollBarThickness;

    const bodyHeightWithoutOverflow = stageHeight - this.theme.rowHeight;
    const bodyHeightWithOverflow = bodyHeightWithoutOverflow - this.theme.scrollBarThickness;

    this.hsbIsVisible = bodyWidthWithOverflow < tableWidth;
    this.vsbIsVisible = bodyHeightWithOverflow < tableHeight;

    const bodyWidth  = this.vsbIsVisible ? bodyWidthWithOverflow  : bodyWidthWithoutOverflow;
    const bodyHeight = this.hsbIsVisible ? bodyHeightWithOverflow : bodyHeightWithoutOverflow;

    this.tableState.setViewportDimensions({ width: bodyWidth, height: bodyHeight });

    this.body.size({ width: bodyWidth, height: bodyHeight });
    this.body.clip({
      x: 0,
      y: 0,
      width: bodyWidth,
      height: bodyHeight
    });
  }

  resizeHead() {
    this.head.width(this.body.width());

    const tableDimensions = this.tableState.getTableDimensions();
    this.header.width(Math.min(this.body.width(), tableDimensions.width));
    this.header.clip({
      x: 0,
      y: 0,
      width: this.header.width(),
      height: this.header.height(),
    });
  }

  updateHorizontalScrollbarVisibility() {
    if (this.hsbIsVisible && !this.hsb.parent) {
      this.layer.add(this.hsb);
    } else if (!this.hsbIsVisible && this.hsb.parent) {
      this.hsb.remove();
    }
  }

  updateVerticalScrollbarVisibility() {
    if (this.vsbIsVisible && !this.vsb.parent) {
      this.layer.add(this.vsb);
    } else if (!this.vsbIsVisible && this.vsb.parent) {
      this.vsb.remove();
    }
  }

  updateBodyGrid() {
    const scrollPosition     = this.tableState.getScrollPosition();
    const tableDimensions    = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges        = this.tableState.getTableRanges();

    const lines = this.bodyLineGroup.children as Line[];
    this.bodyLineGroup.removeChildren();
    this.nodeAllocator.free("line", ...lines);

    const hLineLength = Math.min(this.body.width(), tableDimensions.width);

    // Draw body horizontal lines
    for (let i = tableRanges.rowTop + 1; i < tableRanges.rowBottom; i++) {
      const y = i * this.theme.rowHeight - scrollPosition.y;

      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x: 0,
	y,
	width: hLineLength,
	height: 1,
        fill: this.theme.tableBorderColor
      });
      this.bodyLineGroup.add(line);
    }

    // Draw last body horizontal line
    if (viewportDimensions.height > tableDimensions.height) {
      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x: 0,
	y: tableDimensions.height,
	width: hLineLength,
	height: 1,
	fill: this.theme.tableBorderColor
      });
      this.bodyLineGroup.add(line);
    }

    const vLineLength = Math.min(this.body.height(), tableDimensions.height);

    // Draw body vertical lines
    for (let j = tableRanges.columnLeft + 1; j < tableRanges.columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x,
	y: 0,
	width: 1,
	height: vLineLength,
	fill: this.theme.tableBorderColor
      });
      this.bodyLineGroup.add(line);
    }

    // Draw last body vertical line
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x: tableDimensions.width,
	y: 0,
	width: 1,
	height: vLineLength,
        fill: this.theme.tableBorderColor,
      });
      this.bodyLineGroup.add(line);
    }
  }

  updateHeadGrid() {
    const scrollPosition     = this.tableState.getScrollPosition();
    const tableDimensions    = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges        = this.tableState.getTableRanges();

    const lines = this.headLineGroup.children as Line[];
    this.headLineGroup.removeChildren();
    this.nodeAllocator.free("line", ...lines);

    // Draw bottom head border
    {
      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x: 0,
	y: this.head.height(),
	width: this.head.width(),
	height: 1,
	fill: this.theme.tableBorderColor
      });
      this.headLineGroup.add(line);
    }

    // Draw head vertical lines
    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x,
	width: 1,
	height: this.theme.rowHeight,
        fill: this.theme.tableBorderColor,
      });
      this.headLineGroup.add(line);
    }

    // Draw right header border
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x: tableDimensions.width,
	width: 1,
	height: this.theme.rowHeight,
        fill: this.theme.tableBorderColor
      });
      this.headLineGroup.add(line);
    }

    // Draw right head border
    {
      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x: this.head.width(),
	width: 1,
	height: this.head.height(),
	fill: this.theme.tableBorderColor
      });
      this.headLineGroup.add(line);
    }

    // Draw right header border
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.nodeAllocator.allocate("line");
      line.setAttrs({
	x: tableDimensions.width,
	width: 1,
	height: this.theme.rowHeight,
        fill: this.theme.tableBorderColor
      });
      this.headLineGroup.add(line);
    }
  }

  updateBodyCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges    = this.tableState.getTableRanges();
    const rowHeight      = this.tableState.getRowHeight();

    const bodyCells = this.bodyCellGroup.children as BodyCell[];
    this.bodyCellGroup.removeChildren();
    this.nodeAllocator.free("bodyCell", ...bodyCells);

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;
    for (let rowIndex = rowTop; rowIndex < rowBottom; rowIndex++) {
      const dataRow = this.tableState.getDataRow(rowIndex);
      const y = rowIndex * rowHeight - scrollPosition.y;

      for (let colIndex = columnLeft; colIndex < columnRight; colIndex++) {
        const columnState = this.tableState.getColumnState(colIndex);
        const x = columnState.position - scrollPosition.x;

        const cell = this.nodeAllocator.allocate("bodyCell");
	this.bodyCellGroup.add(cell);

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

    const headCells = this.headCellGroup.children as HeadCell[];
    this.nodeAllocator.free("headCell", ...headCells);
    this.headCellGroup.removeChildren();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const cell = this.nodeAllocator.allocate("headCell");
      this.headCellGroup.add(cell);

      cell.setAttrs({
	x,
	width: columnState.width,
	height: rowHeight,
	text: columnState.title,
	theme: this.theme,
      });
    }
  }

  updateResizeColumnButtons() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges = this.tableState.getTableRanges();

    const buttons = this.resizeColumnButtonGroup.children as ResizeColumnButton[];
    this.nodeAllocator.free("resizeColumnButton", ...buttons);
    this.resizeColumnButtonGroup.removeChildren();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const centerx = columnState.position + columnState.width - scrollPosition.x;

      const button = this.nodeAllocator.allocate("resizeColumnButton");
      this.resizeColumnButtonGroup.add(button);

      button.setAttrs({
	centerx,
	y: 0,
	onMouseDown: () => {
	  this.onClickColumnResizeButton(j, centerx);
	}
      });
    }
  }
}

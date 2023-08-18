import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { throttle } from "lodash";
import {
  Vector,
  TableState,
  ObjectPool,
} from "./core";
import {
  BodyCell,
  HeadCell,
  HorizontalScrollbar,
  VerticalScrollbar,
  Line,
} from "./components";
import { defaultTheme } from "./defaultTheme";
import { MIN_COLUMN_WIDTH } from "./constants";
import {
  CanvasTableOptions,
  ColumnDef,
  DataRow,
  Dimensions,
  Theme,
  VectorLike
} from "./types";
import { ResizeColumnButtonFactory } from "./factories";
import { TextRenderer } from "text-renderer";
import { NodeManager } from "./core/NodeManager";

export class CanvasTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;
  theme: Theme;

  bodyDimensionsWithoutScrollbars = { width: 1, height: 1 };
  bodyDimensionsWithScrollbars    = { width: 1, height: 1 };

  body: Konva.Group;
  bodyCellManager: NodeManager<BodyCell>;
  bodyLineManager: NodeManager<Line>;

  head: Konva.Group;
  header: Konva.Group;
  headCellManager: NodeManager<HeadCell>;
  headLineManager: NodeManager<Line>;

  resizeColumnButtonManager: NodeManager<Konva.Rect>;

  textRenderer: TextRenderer;

  hsb: HorizontalScrollbar;
  vsb: VerticalScrollbar;

  draggables: Konva.Node[] = [];

  constructor(options: CanvasTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.theme = defaultTheme;

    this.tableState = new TableState();
    this.tableState.setRowHeight(defaultTheme.rowHeight);

    this.tableState.setTableData(options.columnDefs, options.dataRows);

    this.body = new Konva.Group({ y: this.theme.rowHeight });
    this.layer.add(this.body);

    this.head = new Konva.Group({ height: this.theme.rowHeight });
    this.layer.add(this.head);

    this.header = new Konva.Group({ height: this.theme.rowHeight });
    this.head.add(this.header);

    this.hsb = new HorizontalScrollbar({
      tableState: this.tableState,
      theme: this.theme,
      y: this.theme.rowHeight,
      height: this.theme.scrollBarThickness
    });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState: this.tableState,
      theme: this.theme,
      y: this.theme.rowHeight,
      width: this.theme.scrollBarThickness
    });
    this.layer.add(this.vsb);

    this.textRenderer = new TextRenderer();

    const linePool = new ObjectPool({
      initialSize: 300,
      factory: {
        make: () => {
          return new Line({ listening: false })
        },
        reset: (line: Line) => {
          return line.position({ x: 0, y: 0 });
        }
      }
    });
    this.bodyLineManager = new NodeManager(linePool);
    this.body.add(this.bodyLineManager.getGroup());

    this.headLineManager = new NodeManager(linePool);
    this.head.add(this.headLineManager.getGroup());

    const bodyCellPool = new ObjectPool({
      initialSize: 1000,
      factory: {
        make: () => new BodyCell({
          textRenderer: this.textRenderer,
          theme: this.theme
        }),
        reset: (cell: BodyCell) => {
          return cell.setAttrs({
            x: 0,
            y: 0
          });
        }
      }
    });
    this.bodyCellManager = new NodeManager(bodyCellPool);
    this.body.add(this.bodyCellManager.getGroup());

    const headCellPool = new ObjectPool({
      initialSize: 30,
      factory: {
        make: () => new HeadCell({
          textRenderer: this.textRenderer,
          theme: this.theme
        }),
        reset: (cell: HeadCell) => {
          return cell.setAttrs({
            x: 0,
            y: 0
          })
        }
      }
    });
    this.headCellManager = new NodeManager(headCellPool);
    this.header.add(this.headCellManager.getGroup());

    const resizeColumnButtonGroupPool = new ObjectPool({
      initialSize: 30,
      factory: new ResizeColumnButtonFactory(this.theme)
    });
    this.resizeColumnButtonManager = new NodeManager(resizeColumnButtonGroupPool);
    this.head.add(this.resizeColumnButtonManager.getGroup());

    this.stage.on("wheel", throttle((event => this.onWheel(event)), 16));
    this.stage.on("mouseup", () => this.clearDraggables());
  }

  static async create(options: CanvasTableOptions) {
    return new CanvasTable({ ...options });
  }

  setTableData(columnDefs: ColumnDef[], dataRows: DataRow[]) {
    this.tableState.setTableData(columnDefs, dataRows);
    this.tableState.setScrollPosition({ x: 0, y: 0 });

    this.updateBodyDimensions();
    this.updateScrollbarVisibility();
    this.updateBody();
    this.updateHead();

    this.hsb.y(this.stage.height() - this.theme.scrollBarThickness);
    this.hsb.width(this.body.width());
    this.hsb.updateThumb();
    this.hsb.repositionThumb();

    this.vsb.x(this.body.width());
    this.vsb.height(this.body.height());
    this.vsb.updateThumb();
    this.vsb.repositionThumb();

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();
  }

  setStageDimensions(stageDimensions: Dimensions) {
    this.stage.size(stageDimensions);

    this.updateBodyDimensions();
    this.updateScrollbarVisibility();
    this.updateBody();
    this.updateHead();

    const stageHeight = this.stage.height();
    this.hsb.y(stageHeight - this.theme.scrollBarThickness);
    this.hsb.width(this.body.width());
    this.hsb.updateThumb();
    this.hsb.repositionThumb();

    this.vsb.x(this.body.width());
    this.vsb.height(this.body.height());
    this.vsb.updateThumb();
    this.vsb.repositionThumb();

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();
  }

  onWheel(event: KonvaEventObject<WheelEvent>) {
    const { x: scrollLeft, y: scrollTop } = this.tableState.scrollPosition;
    const newScrollLeft = scrollLeft + event.evt.deltaX;
    const newScrollTop = scrollTop + event.evt.deltaY;
    const newScrollPosition = new Vector(newScrollLeft, newScrollTop);
    this.tableState.setScrollPosition(newScrollPosition);

    this.hsb.repositionThumb();
    this.vsb.repositionThumb();

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();
  }

  onClickColumnResizeButton(columnIndex: number, x: number) {
    const columnState = this.tableState.getColumnState(columnIndex);

    const onDragMove = throttle((event: KonvaEventObject<MouseEvent>) => {
      const scrollPosition = this.tableState.getScrollPosition();
      const draggable = event.target;
      const dragX = draggable.x() + scrollPosition.x;
      const columnWidth = Math.max(dragX - columnState.position, MIN_COLUMN_WIDTH);
      if (columnWidth !== columnState.width) {
        this.resizeColumn(columnIndex, columnWidth);
      }
    }, 16);

    this.createDraggable({ x, y: 0 }, onDragMove);
  }

  resizeColumn(columnIndex: number, columnWidth: number) {
    this.tableState.setColumnWidth(columnIndex, columnWidth);

    this.updateScrollbarVisibility();
    this.updateBody();
    this.updateHead();

    this.hsb.updateThumb();
    this.hsb.repositionThumb();

    this.vsb.updateThumb();
    this.vsb.repositionThumb();

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();
  }

  updateBodyDimensions() {
    const { width: stageWidth, height: stageHeight } = this.stage.size();

    this.bodyDimensionsWithoutScrollbars.width = stageWidth;
    this.bodyDimensionsWithScrollbars.width = stageWidth - this.theme.scrollBarThickness;

    this.bodyDimensionsWithoutScrollbars.height = stageHeight - this.theme.rowHeight;
    this.bodyDimensionsWithScrollbars.height = stageHeight - this.theme.rowHeight - this.theme.scrollBarThickness;
  }

  updateBody() {
    const bodyWidth = this.vsb.visible()
      ? this.bodyDimensionsWithScrollbars.width
      : this.bodyDimensionsWithoutScrollbars.width;

    const bodyHeight = this.hsb.visible()
      ? this.bodyDimensionsWithScrollbars.height
      : this.bodyDimensionsWithoutScrollbars.height;

    this.tableState.setViewportDimensions({ width: bodyWidth, height: bodyHeight });

    this.body.size({ width: bodyWidth, height: bodyHeight });
    this.body.clip({
      x: 0,
      y: 0,
      width: bodyWidth,
      height: bodyHeight
    });
  }

  updateHead() {
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

  updateScrollbarVisibility() {
    const { width: tableWidth, height: tableHeight } = this.tableState.tableDimensions;

    const hsbShouldBeVisible = this.bodyDimensionsWithScrollbars.width < tableWidth;
    if (hsbShouldBeVisible && !this.hsb.visible()) {
      this.hsb.visible(true);
    } else if (!hsbShouldBeVisible && this.hsb.visible()) {
      this.hsb.visible(false);
    }

    const vsbShouldBeVisible = this.bodyDimensionsWithScrollbars.height < tableHeight;
    if (vsbShouldBeVisible && !this.vsb.visible()) {
      this.vsb.visible(true);
    } else if (!vsbShouldBeVisible && this.vsb.parent) {
      this.vsb.visible(false);
    }
  }

  updateBodyGrid() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableDimensions = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges = this.tableState.getTableRanges();

    this.bodyLineManager.clear();

    const hLineLength = Math.min(this.body.width(), tableDimensions.width);

    // Draw body horizontal lines
    for (let i = tableRanges.rowTop + 1; i < tableRanges.rowBottom; i++) {
      const y = i * this.theme.rowHeight - scrollPosition.y;

      const line = this.bodyLineManager.get();
      line.setAttrs({
        x: 0,
        y,
        width: hLineLength,
        height: 1,
        fill: this.theme.tableBorderColor
      });
    }

    // Draw last body horizontal line
    if (viewportDimensions.height > tableDimensions.height) {
      const line = this.bodyLineManager.get();
      line.setAttrs({
        x: 0,
        y: tableDimensions.height,
        width: hLineLength,
        height: 1,
        fill: this.theme.tableBorderColor
      });
    }

    const vLineLength = Math.min(this.body.height(), tableDimensions.height);

    // Draw body vertical lines
    for (let j = tableRanges.columnLeft + 1; j < tableRanges.columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const line = this.bodyLineManager.get();
      line.setAttrs({
        x,
        y: 0,
        width: 1,
        height: vLineLength,
        fill: this.theme.tableBorderColor
      });
    }

    // Draw last body vertical line
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.bodyLineManager.get();
      line.setAttrs({
        x: tableDimensions.width,
        y: 0,
        width: 1,
        height: vLineLength,
        fill: this.theme.tableBorderColor,
      });
    }
  }

  updateHeadGrid() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableDimensions = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges = this.tableState.getTableRanges();

    this.headLineManager.clear();

    // Draw bottom head border
    {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: 0,
        y: this.head.height(),
        width: this.head.width(),
        height: 1,
        fill: this.theme.tableBorderColor
      });
    }

    // Draw head vertical lines
    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const line = this.headLineManager.get();
      line.setAttrs({
        x,
        width: 1,
        height: this.theme.rowHeight,
        fill: this.theme.tableBorderColor,
      });
    }

    // Draw right header border
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: tableDimensions.width,
        width: 1,
        height: this.theme.rowHeight,
        fill: this.theme.tableBorderColor
      });
    }

    // Draw right head border
    {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: this.head.width(),
        width: 1,
        height: this.head.height(),
        fill: this.theme.tableBorderColor
      });
    }

    // Draw right header border
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: tableDimensions.width,
        width: 1,
        height: this.theme.rowHeight,
        fill: this.theme.tableBorderColor
      });
    }
  }

  updateBodyCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges = this.tableState.getTableRanges();
    const rowHeight = this.tableState.getRowHeight();

    this.bodyCellManager.clear();

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;
    for (let rowIndex = rowTop; rowIndex < rowBottom; rowIndex++) {
      const dataRow = this.tableState.getDataRow(rowIndex);
      const y = rowIndex * rowHeight - scrollPosition.y;

      for (let colIndex = columnLeft; colIndex < columnRight; colIndex++) {
        const columnState = this.tableState.getColumnState(colIndex);
        const x = columnState.position - scrollPosition.x;

        const cell = this.bodyCellManager.get();
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
    const tableRanges = this.tableState.getTableRanges();
    const rowHeight = this.tableState.getRowHeight();

    this.headCellManager.clear();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const x = columnState.position - scrollPosition.x;

      const cell = this.headCellManager.get();
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

    this.resizeColumnButtonManager.clear();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const centerx = columnState.position + columnState.width - scrollPosition.x;

      const button = this.resizeColumnButtonManager.get();
      button.setAttrs({
        centerx,
        y: 0,
        onMouseDown: () => this.onClickColumnResizeButton(j, centerx),
      });
    }
  }

  createDraggable(position: VectorLike, handler: (event: KonvaEventObject<MouseEvent>) => void) {
    const draggable = new Konva.Rect();
    draggable.position(position);
    draggable.on("dragmove", handler);
    draggable.on("dragend", () => draggable.destroy());

    this.layer.add(draggable);
    this.draggables.push(draggable);

    draggable.startDrag();
  }

  clearDraggables() {
    this.draggables.forEach(draggable => draggable.destroy());
    this.draggables = [];
  }
}

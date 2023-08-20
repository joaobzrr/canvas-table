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
import { MIN_COLUMN_WIDTH } from "./constants";
import {
  CanvasTableOptions,
  Dimensions,
  TableConfig,
  VectorLike
} from "./types";
import { TextRenderer } from "text-renderer";
import { NodeManager } from "./core/NodeManager";
import { ResizeColumnButtonFactory } from "./factories";

export class CanvasTable {
  private wrapper: HTMLDivElement;
  private stage: Konva.Stage;
  private layer: Konva.Layer;

  private tableState: TableState;

  private body: Konva.Group;
  private bodyCellManager: NodeManager<BodyCell>;
  private bodyLineManager: NodeManager<Line>;

  private head: Konva.Group;
  private header: Konva.Group;
  private headCellManager: NodeManager<HeadCell>;
  private headLineManager: NodeManager<Line>;

  private resizeColumnButtonManager: NodeManager<Konva.Rect>;

  private textRenderer: TextRenderer;

  private hsb: HorizontalScrollbar;
  private vsb: VerticalScrollbar;

  private columnBeingResized: number | null = null;
  private columnBeingHovered: number | null = null;

  constructor(options: CanvasTableOptions) {
    const { container, ...config } = options;

    const element = document.getElementById(container);
    if (!element) {
      throw new Error(`Element with id '${container}' does not exist`);
    }

    this.wrapper = document.createElement("div");
    element.appendChild(this.wrapper);

    this.stage = new Konva.Stage({ container: this.wrapper });
    this.layer = new Konva.Layer({ imageSmoothingEnabled: false });
    this.stage.add(this.layer);

    this.tableState = new TableState(config);
    const theme = this.tableState.getTheme();

    this.body = new Konva.Group({ y: theme.rowHeight });
    this.layer.add(this.body);

    this.head = new Konva.Group({ height: theme.rowHeight });
    this.layer.add(this.head);

    this.header = new Konva.Group({ height: this.head.height() });
    this.head.add(this.header);

    const onDragThumb = throttle((scrollPosition: VectorLike) => {
      this.tableState.setScrollPosition(scrollPosition);
      this.repaint();
    }, 16);

    this.hsb = new HorizontalScrollbar({
      tableState: this.tableState,
      theme: theme,
      y: theme.rowHeight,
      height: theme.scrollBarThickness,
      onDragThumb
    });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState: this.tableState,
      theme: theme,
      y: theme.rowHeight,
      width: theme.scrollBarThickness,
      onDragThumb
    });
    this.layer.add(this.vsb);

    this.textRenderer = new TextRenderer();

    const linePool = new ObjectPool({
      initialSize: 300,
      factory: {
        make: () => {
          return new Line()
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
        make: () => new BodyCell({ textRenderer: this.textRenderer, theme }),
        reset: (cell: BodyCell) => cell.setAttrs({ x: 0, y: 0 })
      }
    });
    this.bodyCellManager = new NodeManager(bodyCellPool);
    this.body.add(this.bodyCellManager.getGroup());

    const headCellPool = new ObjectPool({
      initialSize: 30,
      factory: {
        make: () => new HeadCell({ textRenderer: this.textRenderer, theme }),
        reset: (cell: HeadCell) => cell.setAttrs({ x: 0, y: 0 })
      }
    });
    this.headCellManager = new NodeManager(headCellPool);
    this.header.add(this.headCellManager.getGroup());

    const resizeColumnButtonFactory = new ResizeColumnButtonFactory({
      theme,
      onMouseDown: columnIndex => {
        this.columnBeingResized = columnIndex
      }
    });
    const resizeColumnButtonPool = new ObjectPool({
      initialSize: 30,
      factory: resizeColumnButtonFactory
    });
    this.resizeColumnButtonManager = new NodeManager(resizeColumnButtonPool);
    this.head.add(this.resizeColumnButtonManager.getGroup());

    this.stage.on("wheel", throttle((event => this.onWheel(event)), 16));

    this.onMouseMove = throttle(this.onMouseMove.bind(this), 16);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  public config(config: TableConfig) {
    this.tableState.config(config);
    this.tableState.setScrollPosition({ x: 0, y: 0 });
    this.reflow();
    this.repaint();
  }

  public resize(stageDimensions: Dimensions) {
    this.stage.size(stageDimensions);
    this.reflow();
    this.repaint();
  }

  public setupGlobalEventListeners() {
    document.addEventListener("mousemove", throttle(this.onMouseMove, 16));
    document.addEventListener("mouseup", this.onMouseUp);
  }

  public teardownGlobalEventListeners() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }

  private onWheel(event: KonvaEventObject<WheelEvent>) {
    // @Note Prevent scrolling while resizing a column
    if (this.columnBeingResized !== null) {
      return;
    }

    const { x: scrollLeft, y: scrollTop } = this.tableState.getScrollPosition();
    const newScrollLeft = scrollLeft + event.evt.deltaX;
    const newScrollTop = scrollTop + event.evt.deltaY;
    const newScrollPosition = new Vector(newScrollLeft, newScrollTop);
    this.tableState.setScrollPosition(newScrollPosition);
    this.repaint();
  }

  private onMouseMove(event: MouseEvent) {
    const canvasBoundingClientRect = this.wrapper.getBoundingClientRect();
    const canvasOffsetX = canvasBoundingClientRect.x;
    const canvasOffsetY = canvasBoundingClientRect.y;
    const mousePos = {
      x: event.clientX - canvasOffsetX,
      y: event.clientY - canvasOffsetY
    };

    let columnIndex: number | null = null;
    const shape = this.stage.getIntersection(mousePos);
    if (shape && shape.hasName("resize-column-button")) {
      columnIndex = shape.getAttr("columnIndex");
    }

    if (columnIndex !== this.columnBeingHovered) {
      if (columnIndex !== null) {
        this.stage.container().style.cursor = "col-resize";
      } else {
        this.stage.container().style.cursor = "default";
      }

      this.columnBeingHovered = columnIndex;
      this.drawResizeColumnButtons();
    }

    if (this.columnBeingResized !== null) {
      const scrollPosition = this.tableState.getScrollPosition();
      const columnState = this.tableState.getColumnState(this.columnBeingResized);
      const viewportColumnPosition = columnState.position - scrollPosition.x;

      let columnWidth = mousePos.x - viewportColumnPosition;
      columnWidth = Math.max(columnWidth, MIN_COLUMN_WIDTH);

      if (columnWidth !== columnState.width) {
        this.tableState.setColumnWidth(this.columnBeingResized, columnWidth);
        this.reflow();
        this.repaint();
      }
    }
  }

  private onMouseUp(_event: MouseEvent) {
    if (this.columnBeingResized !== null) {
      this.columnBeingResized = null;
      this.drawResizeColumnButtons();
    }
  }

  private repaint() {
    this.hsb.repaint();
    this.vsb.repaint();

    this.drawBodyGrid();
    this.drawHeadGrid();
    this.drawBodyCells();
    this.drawHeadCells();
    this.drawResizeColumnButtons();
  }

  private reflow() {
    const { width: stageWidth, height: stageHeight } = this.stage.size();
    const { width: tableWidth, height: tableHeight } = this.tableState.getTableDimensions();
    const { rowHeight, scrollBarThickness } = this.tableState.getTheme();

    const bodyWidthWithoutScrollbars = stageWidth;
    const bodyHeightWithoutScrollbars = stageHeight - rowHeight;

    const hsbShouldBeVisible = bodyWidthWithoutScrollbars < tableWidth;
    if (hsbShouldBeVisible && !this.hsb.visible()) {
      this.hsb.visible(true);
    } else if (!hsbShouldBeVisible && this.hsb.visible()) {
      this.hsb.visible(false);
    }

    const vsbShouldBeVisible = bodyHeightWithoutScrollbars < tableHeight;
    if (vsbShouldBeVisible && !this.vsb.visible()) {
      this.vsb.visible(true);
    } else if (!vsbShouldBeVisible && this.vsb.parent) {
      this.vsb.visible(false);
    }

    const bodyWidthWithScrollbars  = bodyWidthWithoutScrollbars  - scrollBarThickness;
    const bodyHeightWithScrollbars = bodyHeightWithoutScrollbars - scrollBarThickness;

    const bodyWidth = this.vsb.visible()
      ? bodyWidthWithScrollbars
      : bodyWidthWithoutScrollbars

    const bodyHeight = this.hsb.visible()
      ? bodyHeightWithScrollbars
      : bodyHeightWithoutScrollbars;

    this.tableState.setViewportDimensions({ width: bodyWidth, height: bodyHeight });

    this.body.size({ width: bodyWidth, height: bodyHeight });
    this.body.clip({
      x: 0,
      y: 0,
      width: bodyWidth,
      height: bodyHeight
    });

    this.head.width(this.body.width());

    const tableDimensions = this.tableState.getTableDimensions();
    this.header.width(Math.min(this.body.width(), tableDimensions.width));
    this.header.clip({
      x: 0,
      y: 0,
      width: this.header.width(),
      height: this.header.height(),
    });

    this.hsb.y(this.stage.height() - scrollBarThickness);
    this.hsb.width(this.body.width());
    this.hsb.reflow();

    this.vsb.x(this.body.width());
    this.vsb.height(this.body.height());
    this.vsb.reflow();
  }

  private drawBodyGrid() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableDimensions = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges = this.tableState.getTableRanges();
    const { rowHeight, tableBorderColor } = this.tableState.getTheme();

    this.bodyLineManager.clear();

    const hLineLength = Math.min(this.body.width(), tableDimensions.width);

    // Draw body horizontal lines
    for (let i = tableRanges.rowTop + 1; i < tableRanges.rowBottom; i++) {
      const y = i * rowHeight - scrollPosition.y;

      const line = this.bodyLineManager.get();
      line.setAttrs({
        x: 0,
        y,
        width: hLineLength,
        height: 1,
        fill: tableBorderColor
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
        fill: tableBorderColor
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
        fill: tableBorderColor
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
        fill: tableBorderColor,
      });
    }
  }

  private drawHeadGrid() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableDimensions = this.tableState.getTableDimensions();
    const viewportDimensions = this.tableState.getViewportDimensions();
    const tableRanges = this.tableState.getTableRanges();
    const { rowHeight, tableBorderColor } = this.tableState.getTheme();

    this.headLineManager.clear();

    // Draw bottom head border
    {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: 0,
        y: this.head.height(),
        width: this.head.width(),
        height: 1,
        fill: tableBorderColor
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
        height: rowHeight,
        fill: tableBorderColor,
      });
    }

    // Draw right header border
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: tableDimensions.width,
        width: 1,
        height: rowHeight,
        fill: tableBorderColor
      });
    }

    // Draw right head border
    {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: this.head.width(),
        width: 1,
        height: this.head.height(),
        fill: tableBorderColor
      });
    }

    // Draw right header border
    if (viewportDimensions.width > tableDimensions.width) {
      const line = this.headLineManager.get();
      line.setAttrs({
        x: tableDimensions.width,
        width: 1,
        height: rowHeight,
        fill: tableBorderColor
      });
    }
  }

  private drawBodyCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges = this.tableState.getTableRanges();
    const { rowHeight } = this.tableState.getTheme();

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
        }));
      }
    }
  }

  private drawHeadCells() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges = this.tableState.getTableRanges();
    const { rowHeight } = this.tableState.getTheme();

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
      });
    }
  }

  private drawResizeColumnButtons() {
    const scrollPosition = this.tableState.getScrollPosition();
    const tableRanges = this.tableState.getTableRanges();

    this.resizeColumnButtonManager.clear();

    const { columnLeft, columnRight } = tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const centerx = columnState.position + columnState.width - scrollPosition.x;

      const button = this.resizeColumnButtonManager.get();

      let state: string | undefined;
      if (j === this.columnBeingResized) {
        state = "active";
      } else if (j === this.columnBeingHovered) {
        state = "hover";
      } else {
        state = "normal";
      }

      button.setAttrs({
        centerx,
        columnIndex: j,
        state
      });
    }
  }
}

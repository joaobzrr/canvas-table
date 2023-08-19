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
  ResizeColumnButton,
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
import { TextRenderer } from "text-renderer";
import { NodeManager } from "./core/NodeManager";
import { ResizeColumnButtonFactory } from "./factories";

export class CanvasTable {
  private wrapper: HTMLDivElement;
  private stage: Konva.Stage;
  private layer: Konva.Layer;

  private tableState: TableState;
  private theme: Theme;

  private bodyDimensionsWithoutScrollbars = { width: 1, height: 1 };
  private bodyDimensionsWithScrollbars    = { width: 1, height: 1 };

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
    const element = document.getElementById(options.container);
    if (!element) {
      throw new Error(`Element with id '${options.container}' does not exist`);
    }

    this.wrapper = document.createElement("div");
    element.appendChild(this.wrapper);

    this.stage = new Konva.Stage({ container: this.wrapper });
    this.layer = new Konva.Layer({ imageSmoothingEnabled: false });
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
      height: this.theme.scrollBarThickness,
      onDragThumb: throttle(scrollPosition => this.scroll(scrollPosition), 16)
    });
    this.layer.add(this.hsb);

    this.vsb = new VerticalScrollbar({
      tableState: this.tableState,
      theme: this.theme,
      y: this.theme.rowHeight,
      width: this.theme.scrollBarThickness,
      onDragThumb: throttle(scrollPosition => this.scroll(scrollPosition), 16)
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

    const resizeColumnButtonFactory = new ResizeColumnButtonFactory({
      theme: this.theme,
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

  public setupGlobalEventListeners() {
    document.addEventListener("mousemove", throttle(this.onMouseMove, 16));
    document.addEventListener("mouseup", this.onMouseUp);
  }

  public teardownGlobalEventListeners() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }

  public setTableData(columnDefs: ColumnDef[], dataRows: DataRow[]) {
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

  public setStageDimensions(stageDimensions: Dimensions) {
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

  private onWheel(event: KonvaEventObject<WheelEvent>) {
    // @Note Prevent scrolling while resizing a column
    if (this.columnBeingResized !== null) {
      return;
    }

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

  private onMouseMove(event: MouseEvent) {
    const canvasBoundingClientRect = this.wrapper.getBoundingClientRect();
    const canvasOffsetX = canvasBoundingClientRect.x;
    const canvasOffsetY = canvasBoundingClientRect.y;
    const mousePos = {
      x: event.clientX - canvasOffsetX,
      y: event.clientY - canvasOffsetY
    };
    this.hoverResizeColumnButton(mousePos);
    this.resizeColumn(mousePos);
  }

  private onMouseUp(_event: MouseEvent) {
    if (this.columnBeingResized !== null) {
      this.columnBeingResized = null;
      this.updateResizeColumnButtons();
    }
  }

  private scroll(scrollPosition: VectorLike) {
    this.tableState.setScrollPosition(scrollPosition);

    this.updateBodyGrid();
    this.updateHeadGrid();
    this.updateBodyCells();
    this.updateHeadCells();
    this.updateResizeColumnButtons();
  }

  private hoverResizeColumnButton(mousePos: VectorLike) {
    const resizeColumnButtonGroup = this.resizeColumnButtonManager.getGroup();

    let columnIndex = null;
    for (const node of resizeColumnButtonGroup.children!) {
      const button = node as ResizeColumnButton;
      if (button.intersects(mousePos)) {
        columnIndex = button.getAttr("columnIndex") as number;
      }
    }

    if (columnIndex === this.columnBeingHovered) {
      return;
    }

    this.columnBeingHovered = columnIndex;
    if (this.columnBeingHovered !== null) {
      this.stage.container().style.cursor = "col-resize";
    } else {
      this.stage.container().style.cursor = "default";
    }

    this.updateResizeColumnButtons();
  }

  private resizeColumn(mousePos: VectorLike) {
    if (this.columnBeingResized === null) {
      return;
    }

    const scrollPosition = this.tableState.getScrollPosition();
    const columnState = this.tableState.getColumnState(this.columnBeingResized);
    const viewportColumnPosition = columnState.position - scrollPosition.x;

    let columnWidth = mousePos.x - viewportColumnPosition;
    columnWidth = Math.max(columnWidth, MIN_COLUMN_WIDTH);

    if (columnWidth === columnState.width) {
      return;
    }

    this.tableState.setColumnWidth(this.columnBeingResized, columnWidth);

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

  private updateBodyDimensions() {
    const { width: stageWidth, height: stageHeight } = this.stage.size();

    this.bodyDimensionsWithoutScrollbars.width = stageWidth;
    this.bodyDimensionsWithScrollbars.width = stageWidth - this.theme.scrollBarThickness;

    this.bodyDimensionsWithoutScrollbars.height = stageHeight - this.theme.rowHeight;
    this.bodyDimensionsWithScrollbars.height = stageHeight - this.theme.rowHeight - this.theme.scrollBarThickness;
  }

  private updateBody() {
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

  private updateHead() {
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

  private updateScrollbarVisibility() {
    const { width: tableWidth, height: tableHeight } = this.tableState.tableDimensions;

    const hsbShouldBeVisible = this.bodyDimensionsWithoutScrollbars.width < tableWidth;
    if (hsbShouldBeVisible && !this.hsb.visible()) {
      this.hsb.visible(true);
    } else if (!hsbShouldBeVisible && this.hsb.visible()) {
      this.hsb.visible(false);
    }

    const vsbShouldBeVisible = this.bodyDimensionsWithoutScrollbars.height < tableHeight;
    if (vsbShouldBeVisible && !this.vsb.visible()) {
      this.vsb.visible(true);
    } else if (!vsbShouldBeVisible && this.vsb.parent) {
      this.vsb.visible(false);
    }
  }

  private updateBodyGrid() {
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

  private updateHeadGrid() {
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

  private updateBodyCells() {
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

  private updateHeadCells() {
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

  private updateResizeColumnButtons() {
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

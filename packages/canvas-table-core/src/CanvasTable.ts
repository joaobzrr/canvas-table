import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { throttle, merge } from "lodash";
import { TableLayer } from "./TableLayer";
import { ScrollbarLayer } from "./ScrollbarLayer";
import { ColumnResizerLayer } from "./ColumnResizerLayer";
import {
  scale,
  clamp,
  createVector,
  createSize,
  createArea
} from "./utils";
import {
  CanvasTableParams,
  TableState,
  ColumnDef,
  ColumnState,
  DataRow,
  Theme,
  Overflow,
  TableRanges,
  VectorLike,
  Size
} from "./types";
import {
  ReflowEvent,
  ThemeChangedEvent,
  ScrollEvent,
  MouseDownEvent,
  MouseUpEvent,
  MouseMoveEvent
} from "./events";

export class CanvasTable extends EventTarget {
  private stage: Konva.Stage;
  private wrapperEl: HTMLDivElement;

  private tableLayer: TableLayer;
  private scrollbarLayer: ScrollbarLayer;
  private columnResizerLayer: ColumnResizerLayer;

  private tableState: TableState;
  private theme: Theme;

  constructor(params: CanvasTableParams) {
    super();

    const columnStates = this.columnDefsToColumnStates(params.columnDefs);

    this.theme = { ...defaultTheme, ...params.theme };

    this.tableState = CanvasTable.createTableState(columnStates, params.dataRows);
    this.tableState.tableSize = this.calcTableSize(
      this.tableState.columnStates,
      this.theme.rowHeight,
      this.tableState.dataRows.length
    );

    const element = document.getElementById(params.container);
    if (!element) {
      throw new Error(`Element with id "${params.container}" could not be found`);
    }
    element.replaceChildren();
    element.style.overflow = "hidden";

    this.wrapperEl = document.createElement("div");
    element.appendChild(this.wrapperEl);

    this.stage = new Konva.Stage({ container: this.wrapperEl });
    this.stage.on("mousedown", this.onMouseDown.bind(this));
    this.stage.on("wheel", this.onWheel.bind(this));
    if (params.size) this.stage.size(params.size);

    this.tableLayer = new TableLayer(this);
    this.stage.add(this.tableLayer.getLayer());

    this.scrollbarLayer = new ScrollbarLayer(this);
    this.stage.add(this.scrollbarLayer.getLayer());

    this.columnResizerLayer = new ColumnResizerLayer(this);
    this.stage.add(this.columnResizerLayer.getLayer());

    this.onMouseMove = throttle(this.onMouseMove.bind(this), 16);
    this.onMouseUp = this.onMouseUp.bind(this);

    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  private static createTableState(columnStates: ColumnState[], dataRows: DataRow[]) {
    const state = { columnStates, dataRows } as TableState;

    state.scrollPos           = createVector();
    state.maxScrollPos        = createVector();
    state.normalizedScrollPos = createVector();
    state.mousePos            = createVector();

    state.tableSize              = createSize();
    state.scrollSize             = createSize();
    state.viewportSize           = createSize();
    state.normalizedViewportSize = createSize();

    state.mainArea = createArea();
    state.bodyArea = createArea();

    state.overflow = { x: false, y: false };

    state.tableRanges = { columnLeft: 0, columnRight: 0, rowTop: 0, rowBottom: 0 };

    return state;
  }

  public getTableState() {
    return this.tableState;
  }

  public getTheme() {
    return this.theme;
  }

  public getSize() {
    return this.stage.size();
  }

  public setData(columnDefs: ColumnDef[], dataRows: DataRow[]) {
    this.tableState.columnStates = this.columnDefsToColumnStates(columnDefs);
    this.tableState.dataRows = dataRows;

    this.tableState.tableSize = this.calcTableSize(
      this.tableState.columnStates,
      this.theme.rowHeight,
      this.tableState.dataRows.length);

    this.reflow();

    this.dispatchEvent(new ReflowEvent(this.stage.size()));
  }

  public setTheme(theme: Partial<Theme>) {
    this.theme = merge({}, defaultTheme, theme);

    this.tableState.tableSize = this.calcTableSize(
      this.tableState.columnStates,
      this.theme.rowHeight,
      this.tableState.dataRows.length);

    this.reflow();
    this.dispatchEvent(new ThemeChangedEvent(this.theme));
  }

  public setSize(size: Size) {
    if (size.width <= 0 || size.height <= 0) {
      return;
    }

    this.stage.size(size);
    this.reflow();
    this.dispatchEvent(new ReflowEvent(size));
  }

  public setColumnWidth(columnIndex: number, columnWidth: number) {
    // @Todo: Move this to a separate function
    const { columnStates, dataRows } = this.tableState;
    const { rowHeight } = this.theme;

    const columnState = columnStates[columnIndex];
    columnState.width = columnWidth;

    let total = columnState.pos + columnState.width;
    for (let j = columnIndex + 1; j < columnStates.length; j++) {
      const columnState = columnStates[j];
      columnState.pos = total;
      total += columnState.width;
    }

    this.tableState.tableSize = this.calcTableSize(
      columnStates, rowHeight, dataRows.length);

    this.reflow();

    this.dispatchEvent(new ReflowEvent(this.stage.size()));
  }

  public setScrollPos(scrollPos: VectorLike) {
    this.tableState.scrollPos = this.correctScrollPos(
      scrollPos, this.tableState.maxScrollPos);

    const normalizedScrollPos = this.calcNormalizedScrollPos(
      this.tableState.scrollPos,this.tableState.maxScrollPos);

    this.tableState.tableRanges = this.calcTableRanges(
      this.tableState.columnStates,
      this.tableState.scrollPos,
      this.tableState.tableSize,
      this.tableState.viewportSize,
      this.tableState.dataRows.length,
      this.theme.rowHeight);

    this.dispatchEvent(new ScrollEvent(scrollPos, normalizedScrollPos));
  }

  public setNormalizedScrollPos(normalizedScrollPos: VectorLike) {
    this.tableState.normalizedScrollPos =
      this.correctNormalizedScrollPos(normalizedScrollPos);

    this.tableState.scrollPos = this.normalizedToAbsoluteScrollPos(
      this.tableState.normalizedScrollPos,
      this.tableState.maxScrollPos);

    this.tableState.tableRanges = this.calcTableRanges(
      this.tableState.columnStates,
      this.tableState.scrollPos,
      this.tableState.tableSize,
      this.tableState.viewportSize,
      this.tableState.dataRows.length,
      this.theme.rowHeight);

    this.dispatchEvent(new ScrollEvent(this.tableState.scrollPos, normalizedScrollPos));
  }

  public cleanup() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown(event: KonvaEventObject<MouseEvent>) {
    const mousePos = this.getRelativeMousePos({
      x: event.evt.clientX,
      y: event.evt.clientY
    });
    this.dispatchEvent(new MouseDownEvent({
      mousePos,
      button: event.evt.button
    }));
  }

  private onMouseUp(_event: MouseEvent) {
    this.dispatchEvent(new MouseUpEvent());
  }

  private onMouseMove(event: MouseEvent) {
    this.tableState.mousePos = this.getRelativeMousePos({
      x: event.clientX,
      y: event.clientY
    });

    this.dispatchEvent(new MouseMoveEvent(this.tableState.mousePos));
  }

  private onWheel(event: KonvaEventObject<WheelEvent>) {
    const { scrollPos } = this.getTableState();
    const x = scrollPos.x + event.evt.deltaX;
    const y = scrollPos.y + event.evt.deltaY;
    this.setScrollPos({ x, y });
  }

  private getRelativeMousePos(mousePos: VectorLike) {
    const bcr = this.wrapperEl.getBoundingClientRect();
    const x = mousePos.x - bcr.x;
    const y = mousePos.y - bcr.y;
    return { x, y };
  }

  private findColumnIndexAtPosition(
    columnStates: ColumnState[],
    tableWidth: number,
    x: number,
    start = 0
  ) {
    if (start < 0 || start >= columnStates.length) {
      throw new Error("Index out of bounds");
    }

    if (x >= tableWidth) return -1;
    if (x < 0) return -1;
    if (x === 0) return 0;

    let index = start;
    for (; index < columnStates.length; index++) {
      const columnState = columnStates[index];
      if (columnState.pos >= x) {
        break;
      }
    }

    return index - 1;
  }

  private reflow() {
    this.tableState.overflow = this.calcOverflow(
      this.stage.size(),
      this.tableState.tableSize,
      this.theme.rowHeight,
      this.theme.scrollBarThickness);

    this.tableState.mainArea = this.calcMainArea(
      this.stage.size(),
      this.tableState.overflow,
      this.theme.scrollBarThickness);

    this.tableState.bodyArea = this.calcBodyArea(
      this.tableState.mainArea,
      this.theme.rowHeight);

    this.tableState.viewportSize = { ...this.tableState.bodyArea };

    this.tableState.scrollSize = this.calcScrollSize(
      this.tableState.tableSize, this.tableState.viewportSize);

    this.tableState.normalizedViewportSize = this.calcNormalizedViewportSize(
      this.tableState.scrollSize, this.tableState.viewportSize);

    this.tableState.maxScrollPos = this.calcMaxScrollPos(
      this.tableState.scrollSize, this.tableState.viewportSize);

    this.tableState.scrollPos = this.correctScrollPos(
      this.tableState.scrollPos, this.tableState.maxScrollPos);

    this.tableState.normalizedScrollPos = this.calcNormalizedScrollPos(
      this.tableState.scrollPos, this.tableState.maxScrollPos);

    this.tableState.tableRanges = this.calcTableRanges(
      this.tableState.columnStates,
      this.tableState.scrollPos,
      this.tableState.tableSize,
      this.tableState.viewportSize,
      this.tableState.dataRows.length,
      this.theme.rowHeight);
  }

  private calcMainArea(
    stageSize: Size,
    overflow: Overflow,
    scrollBarThickness: number
  ) {
    const width  = overflow.y ? stageSize.width  - scrollBarThickness : stageSize.width;
    const height = overflow.x ? stageSize.height - scrollBarThickness : stageSize.height;
    return { x: 0, y: 0, width, height };
  }

  private calcBodyArea(mainArea: Size, rowHeight: number) {
    const width  = mainArea.width;
    const height = mainArea.height - rowHeight;
    return { x: 0, y: rowHeight, width, height };
  }

  private calcOverflow(
    stageSize: Size,
    tableSize: Size,
    rowHeight: number,
    scrollBarThickness: number
  ) {
    const { width: stageWidth, height: stageHeight } = stageSize;
    const { width: tableWidth, height: tableHeight } = tableSize;

    const outerWidth = stageWidth;
    const outerHeight = stageHeight - rowHeight;

    let overflowX: boolean;
    let overflowY: boolean;
    if (outerWidth >= tableWidth && outerHeight >= tableHeight) {
      overflowX = overflowY = false;
    } else {
      const innerWidth  = outerWidth  - scrollBarThickness;
      const innerHeight = outerHeight - scrollBarThickness;
      overflowX = innerWidth  < tableWidth;
      overflowY = innerHeight < tableHeight;
    }

    return { x: overflowX, y: overflowY };
  }

  private calcMaxScrollPos(scrollSize: Size, viewportSize: Size) {
    const x = scrollSize.width  - viewportSize.width;
    const y = scrollSize.height - viewportSize.height;
    return { x, y }
  }

  private calcNormalizedScrollPos(scrollPos: VectorLike, maxScrollPos: VectorLike) {
    const x = maxScrollPos.x > 0 ? scrollPos.x / maxScrollPos.x : 0;
    const y = maxScrollPos.y > 0 ? scrollPos.y / maxScrollPos.y : 0;
    return { x, y };
  }

  private calcTableSize(
    columnStates: ColumnState[],
    rowHeight: number,
    numberOfRows: number
  ) {
    const lastColumnState = columnStates[columnStates.length - 1];
    const width = lastColumnState.pos + lastColumnState.width;
    const height = numberOfRows * rowHeight;

    return { width, height }
  }

  private calcScrollSize(tableSize: Size, viewportSize: Size): Size {
    const width = Math.max(tableSize.width, viewportSize.width);
    const height = Math.max(tableSize.height, viewportSize.height);
    return { width, height };
  }

  private calcNormalizedViewportSize(scrollSize: Size, viewportSize: Size) {
    const width  = viewportSize.width  / scrollSize.width;
    const height = viewportSize.height / scrollSize.height;
    return { width, height };
  }

  private calcTableRanges(
    columnStates: ColumnState[],
    scrollPos: VectorLike,
    tableSize: Size,
    viewportSize: Size,
    numberOfRows: number,
    rowHeight: number
  ): TableRanges {
    let columnLeft = this.findColumnIndexAtPosition(columnStates, tableSize.width, scrollPos.x);
    if (columnLeft === -1) {
      columnLeft = 0;
    }

    const scrollRight = scrollPos.x + viewportSize.width;
    let columnRight = this.findColumnIndexAtPosition(columnStates, tableSize.width, scrollRight, columnLeft);
    columnRight = columnRight !== -1 ? columnRight + 1 : columnStates.length;

    const rowTop = Math.floor(scrollPos.y / rowHeight);

    const scrollBottom = scrollPos.y + viewportSize.height;
    const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), numberOfRows);

    return {
      columnLeft,
      columnRight,
      rowTop,
      rowBottom
    };
  }

  private correctScrollPos(scrollPos: VectorLike, maxScrollPos: VectorLike) {
    const x = Math.round(clamp(scrollPos.x, 0, maxScrollPos.x));
    const y = Math.round(clamp(scrollPos.y, 0, maxScrollPos.y));
    return { x, y };
  }

  private correctNormalizedScrollPos(normalizedScrollPos: VectorLike) {
    const x = clamp(normalizedScrollPos.x, 0, 1);
    const y = clamp(normalizedScrollPos.y, 0, 1);
    return { x, y };
  }

  private normalizedToAbsoluteScrollPos(normalizedScrollPos: VectorLike, maxScrollPos: VectorLike) {
    const x = Math.round(scale(normalizedScrollPos.x, 0, 1, 0, maxScrollPos.x));
    const y = Math.round(scale(normalizedScrollPos.y, 0, 1, 0, maxScrollPos.y));
    return { x, y };
  }

  private columnDefsToColumnStates(columnDefs: ColumnDef[]) {
    const columnStates = [];
    let total = 0;
    for (const columnDef of columnDefs) {
      columnStates.push({ ...columnDef, pos: total })
      total += columnDef.width;
    }
    return columnStates;
  }
}

const defaultTheme: Theme = {
  rowHeight: 30,
  cellPadding: 12,
  tableBorderColor: "#665C54",
  scrollBarThickness: 20,
  scrollBarTrackMargin: 2,
  scrollBarThumbColor: "black",
  columnResizerColor: "#257AFD",
  columnResizerOpacity: 0.5,
  fontSize: 14,
  fontColor: "black",
  fontFamily: "Arial"
}

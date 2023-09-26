import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { throttle, merge } from "lodash";
import { TableState } from "./TableState";
import { TableLayer } from "./TableLayer";
import { ScrollbarLayer } from "./ScrollbarLayer";
import { ColumnResizerLayer } from "./ColumnResizerLayer";
import { DEFAULT_COLUMN_WIDTH } from "./constants";
import {
  ReflowEvent,
  ThemeChangedEvent,
  ScrollEvent,
  MouseDownEvent,
  MouseUpEvent,
  MouseMoveEvent
} from "./events";
import {
  CanvasTableParams,
  ColumnDef,
  ColumnState,
  DataRow,
  Theme,
  VectorLike,
  Size
} from "./types";

export class CanvasTable extends EventTarget {
  private stage: Konva.Stage;
  private wrapperEl: HTMLDivElement;

  private tableLayer: TableLayer;
  private scrollbarLayer: ScrollbarLayer;
  private columnResizerLayer: ColumnResizerLayer;

  private tableState: TableState;

  private mousePos = { x: 0, y: 0 };

  constructor(params: CanvasTableParams) {
    super();

    const columnStates = this.columnDefsToColumnStates(params.columnDefs);
    const theme = { ...defaultTheme, ...params.theme };
    const tableSize = params.size ?? { width: 0, height: 0 };

    this.tableState = new TableState(columnStates, params.dataRows, theme, tableSize);

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

  

  public setData(columnDefs: ColumnDef[], dataRows: DataRow[]) {
    const columnStates = this.columnDefsToColumnStates(columnDefs);
    this.tableState.setContent(columnStates, dataRows);

    this.dispatchEvent(new ReflowEvent(this.stage.size()));
  }

  public setTheme(theme: Partial<Theme>) {
    this.tableState.setTheme(merge({}, defaultTheme, theme));
    this.dispatchEvent(new ThemeChangedEvent(this.tableState.theme));
  }

  public setSize(size: Size) {
    if (size.width <= 0 || size.height <= 0) {
      return;
    }

    this.stage.size(size);
    this.tableState.setSize(size);

    this.dispatchEvent(new ReflowEvent(size));
  }

  public setColumnWidth(columnIndex: number, columnWidth: number) {
    this.tableState.setColumnWidth(columnIndex, columnWidth);
    this.dispatchEvent(new ReflowEvent(this.stage.size()));
  }

  public setScrollPos(scrollPos: VectorLike) {
    this.tableState.setScrollPos(scrollPos);
    this.dispatchEvent(new ScrollEvent(scrollPos, this.tableState.normalizedScrollPos));
  }

  public setNormalizedScrollPos(normalizedScrollPos: VectorLike) {
    this.tableState.setNormalizedScrollPos(normalizedScrollPos);
    this.dispatchEvent(new ScrollEvent(this.tableState.scrollPos, normalizedScrollPos));
  }

  public cleanup() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }

  public getState() {
    return this.tableState;
  }

  public getTheme() {
    return this.tableState.theme;
  }

  public getSize() {
    return this.stage.size();
  }

  public getMousePos() {
    return this.mousePos;
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
    this.mousePos = this.getRelativeMousePos({ x: event.clientX, y: event.clientY });
    this.dispatchEvent(new MouseMoveEvent(this.mousePos));
  }

  private onWheel(event: KonvaEventObject<WheelEvent>) {
    const { scrollPos } = this.getState();
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

  private columnDefsToColumnStates(columnDefs: ColumnDef[]) {
    const columnStates = [] as ColumnState[];
    let total = 0;
    for (let { width, ...rest } of columnDefs) {
      width = width ?? DEFAULT_COLUMN_WIDTH;
      columnStates.push({ ...rest, width, pos: total });
      total += width;
    }
    return columnStates;
  }
}

const defaultTheme: Theme = {
  rowHeight: 30,
  cellPadding: 12,
  tableBorderColor: "#665C54",
  scrollBarThickness: 20,
  scrollBarTrackMargin: 0,
  scrollBarThumbColor: "black",
  columnResizerColor: "#257AFD",
  columnResizerOpacity: 0.5,
  fontSize: 14,
  fontColor: "black",
  fontFamily: "Arial",
  fontStyle: "normal",
  headerFontStyle: "bold"
}

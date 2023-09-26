import Konva from "konva";
import { throttle } from "lodash";
import { CanvasTable } from "./CanvasTable";
import { MouseDownEvent, MouseMoveEvent } from "./events";
import { COLUMN_RESIZER_WIDTH, MIN_COLUMN_WIDTH } from "./constants";
import { VectorLike } from "./types";

export class ColumnResizerLayer {
  private ct: CanvasTable;

  private layer: Konva.Layer;
  private rect:  Konva.Rect;

  private columnUnderCursor = -1;
  private isResizingColumn = false;

  constructor(ct: CanvasTable) {
    this.ct = ct;

    this.layer = new Konva.Layer();

    const { columnResizerColor, columnResizerOpacity } = this.ct.getTheme();

    this.rect = new Konva.Rect({
      fill: columnResizerColor,
      opacity: columnResizerOpacity,
      draggable: true,
      visible: false
    });
    this.rect.on("dragmove", this.onDragResizer.bind(this));
    this.layer.add(this.rect);

    this.ct.addEventListener("reflow", this.onReflow.bind(this));
    this.ct.addEventListener("scroll", this.onScroll.bind(this));
    this.ct.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.ct.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.ct.addEventListener("mousemove", this.onMouseMove.bind(this));

    this.setColumnWidth = throttle(this.setColumnWidth, 16);
  }

  public getLayer() {
    return this.layer;
  }

  private onReflow() {
    if (!this.isResizingColumn) {
      return;
    }

    const area = this.calcColumnResizerArea(this.columnUnderCursor);
    this.rect.setAttrs({ ...area });
  }

  private onMouseDown(event: Event) {
    const e = event as MouseDownEvent;
    if (e.detail.button !== 0) {
      return;
    }

    this.isResizingColumn = this.columnUnderCursor !== -1;
    if (this.isResizingColumn) {

      const area = this.calcColumnResizerArea(this.columnUnderCursor);
      this.rect.setAttrs({ ...area, visible: true });
      this.rect.startDrag();
    }
  }

  private onMouseUp() {
    this.isResizingColumn = false;

    this.rect.stopDrag();
    this.rect.visible(false)
  }

  private onMouseMove(event: Event) {
    if (this.isResizingColumn) {
      return;
    }

    const { mousePos } = (event as MouseMoveEvent).detail;

    const newColumnUnderCursor = this.findColumnBeingHovered(mousePos);
    const columnUnderCursorChanged = newColumnUnderCursor !== this.columnUnderCursor;
    this.columnUnderCursor = newColumnUnderCursor;

    if (newColumnUnderCursor === -1) {
      this.rect.visible(false);
      return;
    }

    if (columnUnderCursorChanged) {
      const area = this.calcColumnResizerArea(this.columnUnderCursor);
      this.rect.setAttrs({ ...area });
    }

    this.rect.visible(true);
  }

  private onScroll() {
    const mousePos = this.ct.getMousePos();

    const newColumnUnderCursor = this.findColumnBeingHovered(mousePos);
    const columnUnderCursorChanged = newColumnUnderCursor !== this.columnUnderCursor;
    this.columnUnderCursor = newColumnUnderCursor;

    if (newColumnUnderCursor) {
      this.rect.visible(false);
      return;
    }

    if (columnUnderCursorChanged) {
      this.columnUnderCursor = newColumnUnderCursor;

      const area = this.calcColumnResizerArea(this.columnUnderCursor);
      this.rect.setAttrs({ ...area });
    }

    this.rect.visible(true);
  }

  private onDragResizer() {
    const { columnStates, scrollPos } = this.ct.getState();
    const columnState = columnStates[this.columnUnderCursor];

    this.rect.y(0); // Reset y-coordinate
    
    // @Todo Throttle this block instead of setColumnWidth
    {
      const colX = columnState.pos - scrollPos.x;
      const minX = colX + MIN_COLUMN_WIDTH - COLUMN_RESIZER_WIDTH;
      this.rect.x(Math.max(this.rect.x(), minX));

      const newColumnWidth = this.rect.x() + COLUMN_RESIZER_WIDTH - colX;
      this.setColumnWidth(this.columnUnderCursor, newColumnWidth);
    }
  }

  private findColumnBeingHovered(mousePos: VectorLike) {
    const { columnStates, scrollPos, tableRanges } = this.ct.getState();

    const { rowHeight } = this.ct.getTheme();

    if (mousePos.y < 0 || mousePos.y >= rowHeight) {
      return -1;
    }

    const { x: scrollLeft } = scrollPos;
    const { columnLeft, columnRight } = tableRanges;

    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = columnStates[j];
      const centerX = columnState.pos + columnState.width - scrollLeft;
      const x1 = centerX - COLUMN_RESIZER_WIDTH;
      const x2 = centerX + COLUMN_RESIZER_WIDTH + 1;

      if (mousePos.x >= x1 && mousePos.x < x2) {
        return j;
      }
    }

    return -1;
  }

  private calcColumnResizerArea(columnIndex: number) {
    const { columnStates, scrollPos } = this.ct.getState();

    const { x: scrollLeft } = scrollPos;
    const { rowHeight } = this.ct.getTheme();

    const columnState = columnStates[columnIndex];
    const centerX = columnState.pos + columnState.width - scrollLeft;
    const x = centerX - COLUMN_RESIZER_WIDTH;
    const width = (COLUMN_RESIZER_WIDTH * 2) + 1;

    return { x, y: 0, width, height: rowHeight };
  }

  private setColumnWidth(columnIndex: number, columnWidth: number) {
    this.ct.setColumnWidth(columnIndex, columnWidth);
  }
}

import { CanvasTable } from "../../CanvasTable";
import { createRect, createVector, scale } from "../../utils";
import { Vector } from "../../types";
import { MIN_THUMB_LENGTH } from "../../constants";

export class Layout {
  ct: CanvasTable;

  tableRect = createRect();
  bodyRect = createRect();
  headerRect = createRect();

  scrollPos = createVector();

  scrollWidth = 1;
  scrollHeight = 1;

  contentWidth = 1;
  contentHeight = 1;

  gridWidth = 1;
  gridHeight = 1;

  maxScrollX = 0;
  maxScrollY = 0;

  hsbRect = createRect();
  hsbTrackRect = createRect();
  hsbThumbRect = createRect();
  hsbThumbMinX = 0;
  hsbThumbMaxX = 0;

  vsbRect = createRect();
  vsbTrackRect = createRect();
  vsbThumbRect = createRect();
  vsbThumbMinY = 0;
  vsbThumbMaxY = 0;

  overflowX = false;
  overflowY = false;

  columnStart = 0;
  columnEnd = 0;
  rowStart = 0;
  rowEnd = 0;

  canonicalColumnPositions: number[] = [];

  constructor(ct: CanvasTable) {
    this.ct = ct;
  }

  reflow() {
    this.updateMain();
    this.updateScrollbarThumbPositions();
    this.updateViewport();
  }

  updateMain() {
    const { stage, columnStates, dataRows, theme } = this.ct;
    const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = theme;

    const canvasSize = stage.getSize();

    this.contentWidth = 0;
    for (const { width } of columnStates) {
      this.contentWidth += width;
    }
    this.contentHeight = dataRows.length * rowHeight;

    const outerTableWidth = canvasSize.width - 1;
    const outerTableHeight = canvasSize.height - 1;

    const innerTableWidth = outerTableWidth - scrollbarThickness - 1;
    const innerTableHeight = outerTableHeight - scrollbarThickness - 1;

    const outerBodyHeight = outerTableHeight - rowHeight;
    const innerBodyHeight = innerTableHeight - rowHeight;

    if (outerTableWidth >= this.contentWidth && outerBodyHeight >= this.contentHeight) {
      this.overflowX = this.overflowY = false;
    } else {
      this.overflowX = innerTableWidth < this.contentWidth;
      this.overflowY = innerBodyHeight < this.contentHeight;
    }

    let tableWidth: number;
    let bodyWidth: number;

    if (this.overflowY) {
      tableWidth = bodyWidth = innerTableWidth;
    } else {
      tableWidth = bodyWidth = outerTableWidth;
    }

    let tableHeight: number;
    let bodyHeight: number;

    if (this.overflowX) {
      tableHeight = innerTableHeight;
      bodyHeight = innerBodyHeight;
    } else {
      tableHeight = outerTableHeight;
      bodyHeight = outerBodyHeight;
    }

    this.tableRect = {
      x: 0,
      y: 0,
      width: tableWidth,
      height: tableHeight
    };

    this.bodyRect = {
      x: 0,
      y: rowHeight,
      width: bodyWidth,
      height: bodyHeight
    };

    this.headerRect = {
      x: 0,
      y: 0,
      width: tableWidth,
      height: rowHeight
    };

    this.scrollWidth = Math.max(this.contentWidth, bodyWidth);
    this.scrollHeight = Math.max(this.contentHeight, bodyHeight);

    this.maxScrollX = this.scrollWidth - bodyWidth;
    this.maxScrollY = this.scrollHeight - bodyHeight;

    this.gridWidth = Math.min(tableWidth, this.contentWidth);
    this.gridHeight = Math.min(tableHeight, this.contentHeight + rowHeight);

    this.hsbRect.x = 1;
    this.hsbRect.y = tableHeight + 1;
    this.hsbRect.width = tableWidth - 1;
    this.hsbRect.height = scrollbarThickness;

    this.hsbTrackRect.x = this.hsbRect.x + scrollbarTrackMargin;
    this.hsbTrackRect.y = this.hsbRect.y + scrollbarTrackMargin;
    this.hsbTrackRect.width = this.hsbRect.width - scrollbarTrackMargin * 2;
    this.hsbTrackRect.height = this.hsbRect.height - scrollbarTrackMargin * 2;

    this.hsbThumbRect.y = this.hsbTrackRect.y;
    this.hsbThumbRect.height = this.hsbTrackRect.height;
    this.hsbThumbRect.width = Math.max(
      (bodyWidth / this.scrollWidth) * this.hsbTrackRect.width,
      MIN_THUMB_LENGTH
    );
    this.hsbThumbMinX = this.hsbTrackRect.x;
    this.hsbThumbMaxX = this.hsbTrackRect.x + this.hsbTrackRect.width - this.hsbThumbRect.width;

    this.vsbRect.x = tableWidth + 1;
    this.vsbRect.y = rowHeight + 1;
    this.vsbRect.width = scrollbarThickness;
    this.vsbRect.height = bodyHeight - 1;

    this.vsbTrackRect.x = this.vsbRect.x + scrollbarTrackMargin;
    this.vsbTrackRect.y = this.vsbRect.y + scrollbarTrackMargin;
    this.vsbTrackRect.width = this.vsbRect.width - scrollbarTrackMargin * 2;
    this.vsbTrackRect.height = this.vsbRect.height - scrollbarTrackMargin * 2;

    this.vsbThumbRect.x = this.vsbTrackRect.x;
    this.vsbThumbRect.width = this.vsbTrackRect.width;
    this.vsbThumbRect.height = Math.max(
      (bodyHeight / this.scrollHeight) * this.vsbTrackRect.height,
      MIN_THUMB_LENGTH
    );
    this.vsbThumbMinY = this.vsbTrackRect.y;
    this.vsbThumbMaxY = this.vsbTrackRect.y + this.vsbTrackRect.height - this.vsbThumbRect.height;
  }

  updateViewport() {
    const { columnStates, dataRows, theme } = this.ct;

    let columnPos = 0;
    this.canonicalColumnPositions = [];

    for (this.columnStart = 0; this.columnStart < columnStates.length; this.columnStart++) {
      const columnState = columnStates[this.columnStart];
      const nextColumnPos = columnPos + columnState.width;
      if (nextColumnPos > this.scrollPos.x) {
        break;
      }
      this.canonicalColumnPositions.push(columnPos);
      columnPos = nextColumnPos;
    }

    const scrollRight = this.scrollPos.x + this.bodyRect.width;

    for (
      this.columnEnd = this.columnStart;
      this.columnEnd < columnStates.length;
      this.columnEnd++
    ) {
      if (columnPos >= scrollRight) {
        break;
      }
      this.canonicalColumnPositions.push(columnPos);
      columnPos += columnStates[this.columnEnd].width;
    }

    this.rowStart = Math.floor(this.scrollPos.y / theme.rowHeight);

    const scrollBottom = this.scrollPos.y + this.bodyRect.height;
    this.rowEnd = Math.min(Math.ceil(scrollBottom / theme.rowHeight), dataRows.length);
  }

  updateScrollbarThumbPositions() {
    this.hsbThumbRect.x = scale(
      this.scrollPos.x,
      0,
      this.maxScrollX,
      this.hsbThumbMinX,
      this.hsbThumbMaxX
    );

    this.vsbThumbRect.y = scale(
      this.scrollPos.y,
      0,
      this.maxScrollY,
      this.vsbThumbMinY,
      this.vsbThumbMaxY
    );
  }

  scrollTo(scrollPos: Vector) {
    this.scrollPos = scrollPos;

    this.updateScrollbarThumbPositions();
    this.updateViewport();
  }

  scrollSuchThatCellIsVisible(rowIndex: number, columnIndex: number) {
    const { columnStates, theme } = this.ct;
    const { x: scrollX, y: scrollY } = this.scrollPos;

    const newScrollPos = createVector(this.scrollPos);

    const columnState = columnStates[columnIndex];
    const leftScrollX = this.canonicalColumnPositions[columnIndex];
    const rightScrollX = leftScrollX + columnState.width - this.bodyRect.width;

    if (scrollX > leftScrollX) {
      newScrollPos.x = leftScrollX;
    } else if (scrollX < rightScrollX) {
      newScrollPos.x = Math.min(rightScrollX, leftScrollX);
    }

    const topScrollY = rowIndex * theme.rowHeight;
    const bottomScrollY = topScrollY + theme.rowHeight - this.bodyRect.height;

    if (scrollY > topScrollY) {
      newScrollPos.y = topScrollY;
    } else if (scrollY < bottomScrollY) {
      newScrollPos.y = bottomScrollY;
    }

    this.scrollTo(newScrollPos);
  }

  canonicalToscreenPos(canonicalPos: Vector) {
    return createVector(
      this.canonicalToScreenX(canonicalPos.x),
      this.canonicalToScreenY(canonicalPos.y)
    );
  }

  canonicalToScreenX(canonicalX: number) {
    return canonicalX - this.scrollPos.x;
  }

  canonicalToScreenY(canonicalY: number) {
    return canonicalY - this.scrollPos.y;
  }

  screenToCanonicalPos(screenPos: Vector) {
    return createVector(this.screenToCanonicalX(screenPos.x), this.screenToCanonicalY(screenPos.y));
  }

  screenToCanonicalX(screenX: number) {
    return screenX + this.scrollPos.x;
  }

  screenToCanonicalY(screenY: number) {
    return screenY + this.scrollPos.y;
  }
}

import { scale } from "../../utils";
import { MIN_THUMB_LENGTH } from "../../constants";
import { TableContext } from "../TableContext";

export class Layout {
  tblctx: TableContext;

  tableAreaX = 0;
  tableAreaY = 0;
  tableAreaWidth = 1;
  tableAreaHeight = 1;

  bodyAreaX = 0;
  bodyAreaY = 0;
  bodyAreaWidth = 1;
  bodyAreaHeight = 1;

  headerAreaX = 0;
  headerAreaY = 0;
  headerAreaWidth = 1;
  headerAreaHeight = 1;

  actualBodyWidth = 1;
  actualBodyHeight = 1;

  bodyX = 0;
  bodyY = 0;
  bodyWidth = 0;
  bodyHeight = 0;

  scrollX = 0;
  scrollY = 0;

  scrollWidth = 1;
  scrollHeight = 1;

  maxScrollX = 0;
  maxScrollY = 0;

  hsbX = 0;
  hsbY = 0;
  hsbWidth = 1;
  hsbHeight = 1;
  hsbTrackX = 0;
  hsbTrackY = 0;
  hsbTrackWidth = 1;
  hsbTrackHeight = 1;
  hsbThumbX = 0;
  hsbThumbY = 0;
  hsbThumbWidth = 1;
  hsbThumbHeight = 1;
  hsbThumbMinX = 0;
  hsbThumbMaxX = 0;

  vsbX = 0;
  vsbY = 0;
  vsbWidth = 1;
  vsbHeight = 1;
  vsbTrackX = 0;
  vsbTrackY = 0;
  vsbTrackWidth = 1;
  vsbTrackHeight = 1;
  vsbThumbX = 0;
  vsbThumbY = 0;
  vsbThumbWidth = 1;
  vsbThumbHeight = 1;
  vsbThumbMinY = 0;
  vsbThumbMaxY = 0;

  overflowX = false;
  overflowY = false;

  columnStart = 0;
  columnEnd = 0;
  rowStart = 0;
  rowEnd = 0;

  canonicalColumnPositions: number[] = [];

  constructor(tblctx: TableContext) {
    this.tblctx = tblctx;
  }

  reflow() {
    this.updateMain();
    this.updateScrollbarThumbPositions();
    this.updateViewport();

    this.tblctx.emit("reflow", this);
  }

  private updateMain() {
    const { dataRows } = this.tblctx.props;
    const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = this.tblctx.theme;

    const canvasSize = this.tblctx.stage.getSize();

    this.actualBodyWidth = this.sumColumnWidths();
    this.actualBodyHeight = dataRows.length * rowHeight;

    const outerTableWidth = canvasSize.width - 1;
    const outerTableHeight = canvasSize.height - 1;

    const innerTableWidth = outerTableWidth - scrollbarThickness - 1;
    const innerTableHeight = outerTableHeight - scrollbarThickness - 1;

    const outerBodyHeight = outerTableHeight - rowHeight;
    const innerBodyHeight = innerTableHeight - rowHeight;

    if (outerTableWidth >= this.actualBodyWidth && outerBodyHeight >= this.actualBodyHeight) {
      this.overflowX = this.overflowY = false;
    } else {
      this.overflowX = innerTableWidth < this.actualBodyWidth;
      this.overflowY = innerBodyHeight < this.actualBodyHeight;
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

    this.tableAreaX = 0;
    this.tableAreaY = 0;
    this.tableAreaWidth = tableWidth;
    this.tableAreaHeight = tableHeight;

    this.bodyAreaX = 0;
    this.bodyAreaY = rowHeight;
    this.bodyAreaWidth = bodyWidth;
    this.bodyAreaHeight = bodyHeight;

    this.headerAreaX = 0;
    this.headerAreaY = 0;
    this.headerAreaWidth = tableWidth;
    this.headerAreaHeight = rowHeight;

    this.scrollWidth = Math.max(this.actualBodyWidth, bodyWidth);
    this.scrollHeight = Math.max(this.actualBodyHeight, bodyHeight);

    this.maxScrollX = this.scrollWidth - bodyWidth;
    this.maxScrollY = this.scrollHeight - bodyHeight;

    this.bodyY = this.bodyAreaY;
    this.bodyWidth = Math.min(this.bodyAreaWidth, this.actualBodyWidth);
    this.bodyHeight = Math.min(this.bodyAreaHeight, this.actualBodyHeight);

    this.hsbX = 1;
    this.hsbY = tableHeight + 1;
    this.hsbWidth = tableWidth - 1;
    this.hsbHeight = scrollbarThickness;

    this.hsbTrackX = this.hsbX + scrollbarTrackMargin;
    this.hsbTrackY = this.hsbY + scrollbarTrackMargin;
    this.hsbTrackWidth = this.hsbWidth - scrollbarTrackMargin * 2;
    this.hsbTrackHeight = this.hsbHeight - scrollbarTrackMargin * 2;

    this.hsbThumbY = this.hsbTrackY;
    this.hsbThumbHeight = this.hsbTrackHeight;
    this.hsbThumbWidth = Math.max(
      (bodyWidth / this.scrollWidth) * this.hsbTrackWidth,
      MIN_THUMB_LENGTH
    );
    this.hsbThumbMinX = this.hsbTrackX;
    this.hsbThumbMaxX = this.hsbTrackX + this.hsbTrackWidth - this.hsbThumbWidth;

    this.vsbX = tableWidth + 1;
    this.vsbY = rowHeight + 1;
    this.vsbWidth = scrollbarThickness;
    this.vsbHeight = bodyHeight - 1;

    this.vsbTrackX = this.vsbX + scrollbarTrackMargin;
    this.vsbTrackY = this.vsbY + scrollbarTrackMargin;
    this.vsbTrackWidth = this.vsbWidth - scrollbarTrackMargin * 2;
    this.vsbTrackHeight = this.vsbHeight - scrollbarTrackMargin * 2;

    this.vsbThumbX = this.vsbTrackX;
    this.vsbThumbWidth = this.vsbTrackWidth;
    this.vsbThumbHeight = Math.max(
      (bodyHeight / this.scrollHeight) * this.vsbTrackHeight,
      MIN_THUMB_LENGTH
    );
    this.vsbThumbMinY = this.vsbTrackY;
    this.vsbThumbMaxY = this.vsbTrackY + this.vsbTrackHeight - this.vsbThumbHeight;
  }

  private updateViewport() {
    const { dataRows } = this.tblctx.props;
    const { columnWidths } = this.tblctx.state;
    const { rowHeight } = this.tblctx.theme;

    let columnPos = 0;
    this.canonicalColumnPositions = [];

    for (this.columnStart = 0; this.columnStart < columnWidths.length; this.columnStart++) {
      const columnWidth = columnWidths[this.columnStart];
      const nextColumnPos = columnPos + columnWidth;
      if (nextColumnPos > this.scrollX) {
        break;
      }
      this.canonicalColumnPositions.push(columnPos);
      columnPos = nextColumnPos;
    }

    const scrollRight = this.scrollX + this.bodyAreaWidth;

    for (
      this.columnEnd = this.columnStart;
      this.columnEnd < columnWidths.length;
      this.columnEnd++
    ) {
      if (columnPos >= scrollRight) {
        break;
      }
      this.canonicalColumnPositions.push(columnPos);
      columnPos += columnWidths[this.columnEnd];
    }

    this.rowStart = Math.floor(this.scrollY / rowHeight);

    const scrollBottom = this.scrollY + this.bodyAreaHeight;
    this.rowEnd = Math.min(Math.ceil(scrollBottom / rowHeight), dataRows.length);
  }

  private updateScrollbarThumbPositions() {
    this.hsbThumbX = scale(this.scrollX, 0, this.maxScrollX, this.hsbThumbMinX, this.hsbThumbMaxX);

    this.vsbThumbY = scale(this.scrollY, 0, this.maxScrollY, this.vsbThumbMinY, this.vsbThumbMaxY);
  }

  resizeColumn(columnIndex: number, columnWidth: number) {
    const { columnWidths } = this.tblctx.state;
    columnWidths[columnIndex] = columnWidth;

    this.updateMain();

    this.scrollX = Math.min(this.scrollX, this.maxScrollX);
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);
    this.updateScrollbarThumbPositions();
    this.updateViewport();

    this.tblctx.emit("reflow", this);

    const { columnDefs } = this.tblctx.props;
    const columnDef = columnDefs[columnIndex];
    this.tblctx.emit("resizecolumn", columnDef.key, columnWidth);
  }

  scrollTo(scrollX: number, scrollY: number) {
    this.scrollX = scrollX;
    this.scrollY = scrollY;

    this.updateScrollbarThumbPositions();
    this.updateViewport();

    this.tblctx.emit("reflow", this);
  }

  scrollSuchThatCellIsVisible(rowIndex: number, columnIndex: number) {
    const { columnWidths } = this.tblctx.state;
    const { rowHeight } = this.tblctx.theme;

    const columnWidth = columnWidths[columnIndex];
    const scrollLeft = this.canonicalColumnPositions[columnIndex];
    const scrollRight = scrollLeft + columnWidth - this.bodyAreaWidth;

    let newScrollX = this.scrollX;
    if (newScrollX > scrollLeft) {
      newScrollX = scrollLeft;
    } else if (newScrollX < scrollRight) {
      newScrollX = Math.min(scrollRight, scrollLeft);
    }

    const scrollTop = rowIndex * rowHeight;
    const scrollBottom = scrollTop + rowHeight - this.bodyAreaHeight;

    let newScrollY = this.scrollY;
    if (newScrollY > scrollTop) {
      newScrollY = scrollTop;
    } else if (newScrollY < scrollBottom) {
      newScrollY = scrollBottom;
    }

    this.scrollTo(newScrollX, newScrollY);
  }

  *colRange(start = 0) {
    for (let j = this.columnStart + start; j < this.columnEnd; j++) {
      yield j;
    }
  }

  *rowRange(start = 0) {
    for (let i = this.rowStart + start; i < this.rowEnd; i++) {
      yield i;
    }
  }

  getCanonicalColPos(columnIndex: number) {
    return this.canonicalColumnPositions[columnIndex];
  }

  getCanonicalRowPos(rowIndex: number) {
    const { rowHeight } = this.tblctx.theme;
    return rowIndex * rowHeight;
  }

  getScreenColPos(colIndex: number) {
    const canonicalColumnPos = this.getCanonicalColPos(colIndex);
    const screenColumnX = this.canonicalToScreenX(canonicalColumnPos);
    return screenColumnX;
  }

  getScreenRowPos(rowIndex: number) {
    const { rowHeight } = this.tblctx.theme;
    const canonicalRowPos = this.getCanonicalRowPos(rowIndex);
    const screenRowY = this.canonicalToScreenY(canonicalRowPos) + rowHeight;
    return screenRowY;
  }

  canonicalToScreenX(canonicalX: number) {
    return canonicalX - this.scrollX;
  }

  canonicalToScreenY(canonicalY: number) {
    return canonicalY - this.scrollY;
  }

  screenToCanonicalX(screenX: number) {
    return screenX + this.scrollX;
  }

  screenToCanonicalY(screenY: number) {
    return screenY + this.scrollY;
  }

  sumColumnWidths() {
    const { columnWidths } = this.tblctx.state;

    let total = 0;
    for (const width of columnWidths) {
      total += width;
    }
    return total;
  }
}

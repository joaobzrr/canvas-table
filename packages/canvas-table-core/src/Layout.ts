import { type Context } from './Context';
import { clamp, computeColumnWidths, lerp } from './utils';
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  MIN_THUMB_LENGTH,
} from './constants';

export type LayoutParams = {
  context: Context;
};

export class Layout {
  private context: Context;

  public canvasWidth = 1;
  public canvasHeight = 1;

  public tableAreaX = 0;
  public tableAreaY = 0;
  public tableAreaWidth = 1;
  public tableAreaHeight = 1;

  public bodyAreaX = 0;
  public bodyAreaY = 0;
  public bodyAreaWidth = 1;
  public bodyAreaHeight = 1;

  public headAreaX = 0;
  public headAreaY = 0;
  public headAreaWidth = 1;
  public headAreaHeight = 1;

  public bodyVisibleWidth = 1;
  public bodyVisibleHeight = 1;

  public gridWidth = 1;
  public gridHeight = 1;

  public scrollLeft = 0;
  public scrollTop = 0;

  public scrollWidth = 1;
  public scrollHeight = 1;

  public scrollWidthMinCapped = 1;
  public scrollHeightMinCapped = 1;

  public maxScrollX = 0;
  public maxScrollY = 0;

  public hsbX = 0;
  public hsbY = 0;
  public hsbWidth = 1;
  public hsbHeight = 1;

  public hsbTrackX = 0;
  public hsbTrackY = 0;
  public hsbTrackWidth = 1;
  public hsbTrackHeight = 1;

  public hsbThumbX = 0;
  public hsbThumbY = 0;
  public hsbThumbWidth = 1;
  public hsbThumbHeight = 1;

  public hsbThumbMinX = 0;
  public hsbThumbMaxX = 0;

  public vsbX = 0;
  public vsbY = 0;
  public vsbWidth = 1;
  public vsbHeight = 1;

  public vsbTrackX = 0;
  public vsbTrackY = 0;
  public vsbTrackWidth = 1;
  public vsbTrackHeight = 1;

  public vsbThumbX = 0;
  public vsbThumbY = 0;
  public vsbThumbWidth = 1;
  public vsbThumbHeight = 1;

  public vsbThumbMinY = 0;
  public vsbThumbMaxY = 0;

  public overflowX = false;
  public overflowY = false;

  public columnStart = 0;
  public columnEnd = 0;
  public rowStart = 0;
  public rowEnd = 0;

  public columnWidths = [] as number[];
  public columnPositions = [] as number[];

  constructor(params: LayoutParams) {
    this.context = params.context;
    this.columnWidths = computeColumnWidths(this.context.props.columnDefs);
  }

  public refreshLayout() {
    this.canvasWidth = this.context.platform.canvas.width;
    this.canvasHeight = this.context.platform.canvas.height;

    let scrollWidth = 0;
    for (const width of this.columnWidths) {
      scrollWidth += width;
    }
    scrollWidth -= 1;

    const scrollHeight =
      this.context.props.dataRows.length * this.context.props.theme.rowHeight - 1;

    this.scrollWidth = scrollWidth;
    this.scrollHeight = scrollHeight;

    const tableOuterWidth = this.canvasWidth;
    const tableInnerWidth = tableOuterWidth - this.context.props.theme.scrollbarThickness;
    const tableOuterHeight = this.canvasHeight;
    const tableInnerHeight = tableOuterHeight - this.context.props.theme.scrollbarThickness;

    const bodyOuterWidth = tableOuterWidth;
    const bodyInnerWidth = tableInnerWidth;
    const bodyOuterHeight = tableOuterHeight - this.context.props.theme.rowHeight;
    const bodyInnerHeight = tableInnerHeight - this.context.props.theme.rowHeight;

    if (bodyOuterWidth >= this.scrollWidth && bodyOuterHeight >= this.scrollHeight) {
      this.overflowX = this.overflowY = false;
    } else {
      this.overflowX = bodyInnerWidth < this.scrollWidth;
      this.overflowY = bodyInnerHeight < this.scrollHeight;
    }

    let tableAreaWidth: number;
    let bodyAreaWidth: number;
    if (this.overflowY) {
      tableAreaWidth = tableInnerWidth;
      bodyAreaWidth = bodyInnerWidth;
    } else {
      tableAreaWidth = tableOuterWidth;
      bodyAreaWidth = bodyOuterWidth;
    }

    let tableAreaHeight: number;
    let bodyAreaHeight: number;
    if (this.overflowX) {
      tableAreaHeight = tableInnerHeight;
      bodyAreaHeight = bodyInnerHeight;
    } else {
      tableAreaHeight = tableOuterHeight;
      bodyAreaHeight = bodyOuterHeight;
    }

    this.tableAreaX = 0;
    this.tableAreaY = 0;
    this.tableAreaWidth = tableAreaWidth;
    this.tableAreaHeight = tableAreaHeight;

    this.bodyAreaX = this.tableAreaX;
    this.bodyAreaY = this.tableAreaY + this.context.props.theme.rowHeight;
    this.bodyAreaWidth = bodyAreaWidth;
    this.bodyAreaHeight = bodyAreaHeight;

    this.headAreaX = this.tableAreaX;
    this.headAreaY = this.tableAreaY;
    this.headAreaWidth = tableAreaWidth;
    this.headAreaHeight = this.context.props.theme.rowHeight;

    this.scrollWidthMinCapped = Math.max(this.scrollWidth, this.bodyAreaWidth);
    this.scrollHeightMinCapped = Math.max(this.scrollHeight, this.bodyAreaHeight);

    this.maxScrollX = this.scrollWidthMinCapped - this.bodyAreaWidth;
    this.maxScrollY = this.scrollHeightMinCapped - this.bodyAreaHeight;

    this.bodyVisibleWidth = Math.min(this.bodyAreaWidth, this.scrollWidth);
    this.bodyVisibleHeight = Math.min(this.bodyAreaHeight, this.scrollHeight);

    this.gridWidth = this.bodyVisibleWidth;
    this.gridHeight = this.bodyVisibleHeight + this.context.props.theme.rowHeight;

    this.hsbX = this.tableAreaX;
    this.hsbY = this.tableAreaY + this.tableAreaHeight;
    this.hsbWidth = this.tableAreaWidth;
    this.hsbHeight = this.context.props.theme.scrollbarThickness;

    this.hsbTrackX = this.hsbX + this.context.props.theme.scrollbarPadding;
    this.hsbTrackY = this.hsbY + this.context.props.theme.scrollbarPadding + BORDER_WIDTH;
    this.hsbTrackWidth = this.hsbWidth - this.context.props.theme.scrollbarPadding * 2;
    this.hsbTrackHeight = this.hsbHeight - this.context.props.theme.scrollbarPadding * 2;

    this.hsbThumbY = this.hsbTrackY;
    this.hsbThumbHeight = this.hsbTrackHeight;
    this.hsbThumbWidth = Math.max(
      (bodyAreaWidth / this.scrollWidthMinCapped) * this.hsbTrackWidth,
      MIN_THUMB_LENGTH,
    );
    this.hsbThumbMinX = this.hsbTrackX;
    this.hsbThumbMaxX = this.hsbTrackX + this.hsbTrackWidth - this.hsbThumbWidth;

    this.vsbX = this.tableAreaX + this.tableAreaWidth;
    this.vsbY = this.bodyAreaY;
    this.vsbWidth = this.context.props.theme.scrollbarThickness;
    this.vsbHeight = this.bodyAreaHeight;

    this.vsbTrackX = this.vsbX + this.context.props.theme.scrollbarPadding + BORDER_WIDTH;
    this.vsbTrackY = this.vsbY + this.context.props.theme.scrollbarPadding;
    this.vsbTrackWidth = this.vsbWidth - this.context.props.theme.scrollbarPadding * 2;
    this.vsbTrackHeight = this.vsbHeight - this.context.props.theme.scrollbarPadding * 2;

    this.vsbThumbX = this.vsbTrackX;
    this.vsbThumbWidth = this.vsbTrackWidth;
    this.vsbThumbHeight = Math.max(
      (bodyAreaHeight / this.scrollHeightMinCapped) * this.vsbTrackHeight,
      MIN_THUMB_LENGTH,
    );
    this.vsbThumbMinY = this.vsbTrackY;
    this.vsbThumbMaxY = this.vsbTrackY + this.vsbTrackHeight - this.vsbThumbHeight;
  }

  public refreshViewport() {
    let columnPos = 0;
    this.columnPositions = [];

    for (this.columnStart = 0; this.columnStart < this.columnWidths.length; this.columnStart++) {
      const column_width = this.columnWidths[this.columnStart];
      const nextColumnPos = columnPos + column_width;
      if (nextColumnPos > this.scrollLeft) {
        break;
      }
      this.columnPositions.push(columnPos);
      columnPos = nextColumnPos;
    }

    for (
      this.columnEnd = this.columnStart;
      this.columnEnd < this.columnWidths.length;
      this.columnEnd++
    ) {
      if (columnPos >= this.scrollLeft + this.bodyAreaWidth) {
        break;
      }

      this.columnPositions.push(columnPos);
      columnPos += this.columnWidths[this.columnEnd];
    }

    this.rowStart = Math.floor(this.scrollTop / this.context.props.theme.rowHeight);
    this.rowEnd = Math.min(
      Math.ceil((this.scrollTop + this.bodyAreaHeight) / this.context.props.theme.rowHeight),
      this.context.props.dataRows.length,
    );
  }

  public calculateHorizontalScrollbarThumbX() {
    return Math.round(
      lerp(this.scrollLeft, 0, this.maxScrollX, this.hsbThumbMinX, this.hsbThumbMaxX),
    );
  }

  public calculateVerticalScrollbarThumbY() {
    return Math.round(
      lerp(this.scrollTop, 0, this.maxScrollY, this.vsbThumbMinY, this.vsbThumbMaxY),
    );
  }

  public calculateResizerScrollX(columnIndex: number) {
    const { columnWidths, scrollWidthMinCapped } = this;

    const columnScrollLeft = this.calculateColumnScrollLeft(columnIndex);

    const columnWidth = columnWidths[columnIndex];
    const columnScrollRight = columnScrollLeft + columnWidth;

    const resizerScrollLeft = Math.min(
      columnScrollRight - COLUMN_RESIZER_LEFT_WIDTH - 1,
      scrollWidthMinCapped - COLUMN_RESIZER_WIDTH,
    );
    return resizerScrollLeft;
  }

  public calculateHoveredRowIndex() {
    const { currMouseY } = this.context.platform;

    const { bodyAreaX: x, bodyAreaY: y, bodyVisibleWidth: width, bodyVisibleHeight: height } = this;

    const { rowHeight } = this.context.props.theme;

    let mouseRow: number;
    if (this.context.platform.isMouseInRect(x, y, width, height)) {
      mouseRow = Math.floor(this.screenToScrollY(currMouseY) / rowHeight);
    } else {
      mouseRow = -1;
    }

    return mouseRow;
  }

  public calculateColumnScrollLeft(columnIndex: number) {
    return this.columnPositions[columnIndex];
  }

  public calculateRowScrollTop(rowIndex: number) {
    return rowIndex * this.context.props.theme.rowHeight;
  }

  public calculateColumnScreenLeft(columnIndex: number) {
    const columnScrollLeft = this.calculateColumnScrollLeft(columnIndex);
    const columnScreenLeft = this.scrollToScreenX(columnScrollLeft);
    return columnScreenLeft;
  }

  public calculateColumnScreenRight(columnIndex: number) {
    const { columnWidths } = this;
    const columnScreenLeft = this.calculateColumnScreenLeft(columnIndex);
    return columnScreenLeft + columnWidths[columnIndex];
  }

  public calculateRowScreenTop(rowIndex: number) {
    const rowScrollTop = this.calculateRowScrollTop(rowIndex);
    const rowScreenTop = this.scrollToScreenY(rowScrollTop);
    return rowScreenTop;
  }

  public calculateRowScreenBottom(rowIndex: number) {
    const { rowHeight } = this.context.props.theme;
    const rowScreenTop = this.calculateRowScreenTop(rowIndex);
    return rowScreenTop + rowHeight;
  }

  public scrollToScreenX(scrollX: number) {
    const { bodyAreaX, scrollLeft } = this;
    return scrollX - scrollLeft + bodyAreaX;
  }

  public scrollToScreenY(scrollY: number) {
    const { bodyAreaY, scrollTop } = this;
    return scrollY - scrollTop + bodyAreaY;
  }

  public screenToScrollX(screenX: number) {
    const { bodyAreaX, scrollLeft } = this;
    return screenX - bodyAreaX + scrollLeft;
  }

  public screenToScrollY(screenY: number) {
    const { bodyAreaY, scrollTop } = this;
    return screenY - bodyAreaY + scrollTop;
  }

  public calculateScrollX(hsbThumbX: number) {
    return Math.round(lerp(hsbThumbX, this.hsbThumbMinX, this.hsbThumbMaxX, 0, this.maxScrollX));
  }

  public calculateScrollY(vsbThumbY: number) {
    return Math.round(lerp(vsbThumbY, this.vsbThumbMinY, this.vsbThumbMaxY, 0, this.maxScrollY));
  }

  public updateScrollPos(scrollAmountX: number, scrollAmountY: number) {
    this.scrollLeft = clamp(this.scrollLeft + scrollAmountX, 0, this.maxScrollX);
    this.scrollTop = clamp(this.scrollTop + scrollAmountY, 0, this.maxScrollY);

    this.hsbThumbX = this.calculateHorizontalScrollbarThumbX();
    this.vsbThumbY = this.calculateVerticalScrollbarThumbY();
  }
}

import { type Context } from './Context';
import { clamp, lerp } from './utils';
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_THUMB_LENGTH,
} from './constants';
import type { ColumnDef } from './types';

export type TableLayout = ReturnType<typeof makeLayout>;

export type TableStateParams = {
  context: Context;
};

export class TableState {
  private context: Context;
  public layout: TableLayout;

  constructor(params: TableStateParams) {
    this.context = params.context;
    this.layout = TableState.createInitialLayout(this.context.props.columnDefs);
  }

  public refreshLayout() {
    let scrollWidth = 0;
    for (const width of this.layout.columnWidths) {
      scrollWidth += width;
    }
    scrollWidth -= 1;

    const scrollHeight =
      this.context.props.dataRows.length * this.context.props.theme.rowHeight - 1;

    this.layout.scrollWidth = scrollWidth;
    this.layout.scrollHeight = scrollHeight;

    const tableOuterWidth = this.layout.canvasWidth;
    const tableInnerWidth = tableOuterWidth - this.context.props.theme.scrollbarThickness;
    const tableOuterHeight = this.layout.canvasHeight;
    const tableInnerHeight = tableOuterHeight - this.context.props.theme.scrollbarThickness;

    const bodyOuterWidth = tableOuterWidth;
    const bodyInnerWidth = tableInnerWidth;
    const bodyOuterHeight = tableOuterHeight - this.context.props.theme.rowHeight;
    const bodyInnerHeight = tableInnerHeight - this.context.props.theme.rowHeight;

    if (bodyOuterWidth >= this.layout.scrollWidth && bodyOuterHeight >= this.layout.scrollHeight) {
      this.layout.overflowX = this.layout.overflowY = false;
    } else {
      this.layout.overflowX = bodyInnerWidth < this.layout.scrollWidth;
      this.layout.overflowY = bodyInnerHeight < this.layout.scrollHeight;
    }

    let tableAreaWidth: number;
    let bodyAreaWidth: number;
    if (this.layout.overflowY) {
      tableAreaWidth = tableInnerWidth;
      bodyAreaWidth = bodyInnerWidth;
    } else {
      tableAreaWidth = tableOuterWidth;
      bodyAreaWidth = bodyOuterWidth;
    }

    let tableAreaHeight: number;
    let bodyAreaHeight: number;
    if (this.layout.overflowX) {
      tableAreaHeight = tableInnerHeight;
      bodyAreaHeight = bodyInnerHeight;
    } else {
      tableAreaHeight = tableOuterHeight;
      bodyAreaHeight = bodyOuterHeight;
    }

    this.layout.tableAreaX = 0;
    this.layout.tableAreaY = 0;
    this.layout.tableAreaWidth = tableAreaWidth;
    this.layout.tableAreaHeight = tableAreaHeight;

    this.layout.bodyAreaX = this.layout.tableAreaX;
    this.layout.bodyAreaY = this.layout.tableAreaY + this.context.props.theme.rowHeight;
    this.layout.bodyAreaWidth = bodyAreaWidth;
    this.layout.bodyAreaHeight = bodyAreaHeight;

    this.layout.headAreaX = this.layout.tableAreaX;
    this.layout.headAreaY = this.layout.tableAreaY;
    this.layout.headAreaWidth = tableAreaWidth;
    this.layout.headAreaHeight = this.context.props.theme.rowHeight;

    this.layout.scrollWidthMinCapped = Math.max(this.layout.scrollWidth, this.layout.bodyAreaWidth);
    this.layout.scrollHeightMinCapped = Math.max(
      this.layout.scrollHeight,
      this.layout.bodyAreaHeight,
    );

    this.layout.maxScrollX = this.layout.scrollWidthMinCapped - this.layout.bodyAreaWidth;
    this.layout.maxScrollY = this.layout.scrollHeightMinCapped - this.layout.bodyAreaHeight;

    this.layout.bodyVisibleWidth = Math.min(this.layout.bodyAreaWidth, this.layout.scrollWidth);
    this.layout.bodyVisibleHeight = Math.min(this.layout.bodyAreaHeight, this.layout.scrollHeight);

    this.layout.gridWidth = this.layout.bodyVisibleWidth;
    this.layout.gridHeight = this.layout.bodyVisibleHeight + this.context.props.theme.rowHeight;

    this.layout.hsbX = this.layout.tableAreaX;
    this.layout.hsbY = this.layout.tableAreaY + this.layout.tableAreaHeight;
    this.layout.hsbWidth = this.layout.tableAreaWidth;
    this.layout.hsbHeight = this.context.props.theme.scrollbarThickness;

    this.layout.hsbTrackX = this.layout.hsbX + this.context.props.theme.scrollbarPadding;
    this.layout.hsbTrackY =
      this.layout.hsbY + this.context.props.theme.scrollbarPadding + BORDER_WIDTH;
    this.layout.hsbTrackWidth =
      this.layout.hsbWidth - this.context.props.theme.scrollbarPadding * 2;
    this.layout.hsbTrackHeight =
      this.layout.hsbHeight - this.context.props.theme.scrollbarPadding * 2;

    this.layout.hsbThumbY = this.layout.hsbTrackY;
    this.layout.hsbThumbHeight = this.layout.hsbTrackHeight;
    this.layout.hsbThumbWidth = Math.max(
      (bodyAreaWidth / this.layout.scrollWidthMinCapped) * this.layout.hsbTrackWidth,
      MIN_THUMB_LENGTH,
    );
    this.layout.hsbThumbMinX = this.layout.hsbTrackX;
    this.layout.hsbThumbMaxX =
      this.layout.hsbTrackX + this.layout.hsbTrackWidth - this.layout.hsbThumbWidth;

    this.layout.vsbX = this.layout.tableAreaX + this.layout.tableAreaWidth;
    this.layout.vsbY = this.layout.bodyAreaY;
    this.layout.vsbWidth = this.context.props.theme.scrollbarThickness;
    this.layout.vsbHeight = this.layout.bodyAreaHeight;

    this.layout.vsbTrackX =
      this.layout.vsbX + this.context.props.theme.scrollbarPadding + BORDER_WIDTH;
    this.layout.vsbTrackY = this.layout.vsbY + this.context.props.theme.scrollbarPadding;
    this.layout.vsbTrackWidth =
      this.layout.vsbWidth - this.context.props.theme.scrollbarPadding * 2;
    this.layout.vsbTrackHeight =
      this.layout.vsbHeight - this.context.props.theme.scrollbarPadding * 2;

    this.layout.vsbThumbX = this.layout.vsbTrackX;
    this.layout.vsbThumbWidth = this.layout.vsbTrackWidth;
    this.layout.vsbThumbHeight = Math.max(
      (bodyAreaHeight / this.layout.scrollHeightMinCapped) * this.layout.vsbTrackHeight,
      MIN_THUMB_LENGTH,
    );
    this.layout.vsbThumbMinY = this.layout.vsbTrackY;
    this.layout.vsbThumbMaxY =
      this.layout.vsbTrackY + this.layout.vsbTrackHeight - this.layout.vsbThumbHeight;
  }

  public refreshViewport() {
    let columnPos = 0;
    this.layout.columnPositions = [];

    for (
      this.layout.columnStart = 0;
      this.layout.columnStart < this.layout.columnWidths.length;
      this.layout.columnStart++
    ) {
      const column_width = this.layout.columnWidths[this.layout.columnStart];
      const nextColumnPos = columnPos + column_width;
      if (nextColumnPos > this.layout.scrollLeft) {
        break;
      }
      this.layout.columnPositions.push(columnPos);
      columnPos = nextColumnPos;
    }

    for (
      this.layout.columnEnd = this.layout.columnStart;
      this.layout.columnEnd < this.layout.columnWidths.length;
      this.layout.columnEnd++
    ) {
      if (columnPos >= this.layout.scrollLeft + this.layout.bodyAreaWidth) {
        break;
      }

      this.layout.columnPositions.push(columnPos);
      columnPos += this.layout.columnWidths[this.layout.columnEnd];
    }

    this.layout.rowStart = Math.floor(this.layout.scrollTop / this.context.props.theme.rowHeight);
    this.layout.rowEnd = Math.min(
      Math.ceil(
        (this.layout.scrollTop + this.layout.bodyAreaHeight) / this.context.props.theme.rowHeight,
      ),
      this.context.props.dataRows.length,
    );
  }

  public calculateHorizontalScrollbarThumbX() {
    return Math.round(
      lerp(
        this.layout.scrollLeft,
        0,
        this.layout.maxScrollX,
        this.layout.hsbThumbMinX,
        this.layout.hsbThumbMaxX,
      ),
    );
  }

  public calculateVerticalScrollbarThumbY() {
    return Math.round(
      lerp(
        this.layout.scrollTop,
        0,
        this.layout.maxScrollY,
        this.layout.vsbThumbMinY,
        this.layout.vsbThumbMaxY,
      ),
    );
  }

  public calculateResizerScrollX(columnIndex: number) {
    const { columnWidths, scrollWidthMinCapped } = this.layout;

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

    const {
      bodyAreaX: x,
      bodyAreaY: y,
      bodyVisibleWidth: width,
      bodyVisibleHeight: height,
    } = this.layout;

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
    return this.layout.columnPositions[columnIndex];
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
    const { columnWidths } = this.layout;
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
    const { bodyAreaX, scrollLeft } = this.layout;
    return scrollX - scrollLeft + bodyAreaX;
  }

  public scrollToScreenY(scrollY: number) {
    const { bodyAreaY, scrollTop } = this.layout;
    return scrollY - scrollTop + bodyAreaY;
  }

  public screenToScrollX(screenX: number) {
    const { bodyAreaX, scrollLeft } = this.layout;
    return screenX - bodyAreaX + scrollLeft;
  }

  public screenToScrollY(screenY: number) {
    const { bodyAreaY, scrollTop } = this.layout;
    return screenY - bodyAreaY + scrollTop;
  }

  public calculateScrollX(hsbThumbX: number) {
    return Math.round(
      lerp(
        hsbThumbX,
        this.layout.hsbThumbMinX,
        this.layout.hsbThumbMaxX,
        0,
        this.layout.maxScrollX,
      ),
    );
  }

  public calculateScrollY(vsbThumbY: number) {
    return Math.round(
      lerp(
        vsbThumbY,
        this.layout.vsbThumbMinY,
        this.layout.vsbThumbMaxY,
        0,
        this.layout.maxScrollY,
      ),
    );
  }

  private static createInitialLayout(columnDefs: ColumnDef[]) {
    return makeLayout(TableState.calculateColumnWidths(columnDefs));
  }

  private static calculateColumnWidths(columnDefs: ColumnDef[]) {
    const columnWidths = [] as number[];
    for (const { width } of columnDefs) {
      columnWidths.push(width ?? DEFAULT_COLUMN_WIDTH);
    }
    return columnWidths;
  }

  public updateScrollPos(scrollAmountX: number, scrollAmountY: number) {
    this.layout.scrollLeft = clamp(
      this.layout.scrollLeft + scrollAmountX,
      0,
      this.layout.maxScrollX,
    );
    this.layout.scrollTop = clamp(this.layout.scrollTop + scrollAmountY, 0, this.layout.maxScrollY);

    this.layout.hsbThumbX = this.calculateHorizontalScrollbarThumbX();
    this.layout.vsbThumbY = this.calculateVerticalScrollbarThumbY();
  }
}

const makeLayout = (columnWidths: number[]) => ({
  canvasWidth: 1,
  canvasHeight: 1,

  tableAreaX: 0,
  tableAreaY: 0,
  tableAreaWidth: 1,
  tableAreaHeight: 1,

  bodyAreaX: 0,
  bodyAreaY: 0,
  bodyAreaWidth: 1,
  bodyAreaHeight: 1,

  headAreaX: 0,
  headAreaY: 0,
  headAreaWidth: 1,
  headAreaHeight: 1,

  bodyVisibleWidth: 1,
  bodyVisibleHeight: 1,

  gridWidth: 1,
  gridHeight: 1,

  scrollLeft: 0,
  scrollTop: 0,

  scrollWidth: 1,
  scrollHeight: 1,

  scrollWidthMinCapped: 1,
  scrollHeightMinCapped: 1,

  maxScrollX: 0,
  maxScrollY: 0,

  hsbX: 0,
  hsbY: 0,
  hsbWidth: 1,
  hsbHeight: 1,

  hsbTrackX: 0,
  hsbTrackY: 0,
  hsbTrackWidth: 1,
  hsbTrackHeight: 1,

  hsbThumbX: 0,
  hsbThumbY: 0,
  hsbThumbWidth: 1,
  hsbThumbHeight: 1,

  hsbThumbMinX: 0,
  hsbThumbMaxX: 0,

  vsbX: 0,
  vsbY: 0,
  vsbWidth: 1,
  vsbHeight: 1,

  vsbTrackX: 0,
  vsbTrackY: 0,
  vsbTrackWidth: 1,
  vsbTrackHeight: 1,

  vsbThumbX: 0,
  vsbThumbY: 0,
  vsbThumbWidth: 1,
  vsbThumbHeight: 1,

  vsbThumbMinY: 0,
  vsbThumbMaxY: 0,

  overflowX: false,
  overflowY: false,

  columnStart: 0,
  columnEnd: 0,
  rowStart: 0,
  rowEnd: 0,

  columnWidths: columnWidths ?? [],
  columnPositions: [] as number[],
});

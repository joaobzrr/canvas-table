import { type Platform } from './Platform';
import { GuiContext } from './GuiContext';
import { clamp, lerp } from './utils';
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MIN_THUMB_LENGTH,
} from './constants';
import type { CanvasTableProps, ColumnDef } from './types';

export type TableLayout = ReturnType<typeof makeLayout>;

export class TableState {
  private platform: Platform;
  public props: CanvasTableProps;
  public layout: TableLayout;
  public guictx: GuiContext;

  constructor(
    platform: Platform,
    props: CanvasTableProps,
    layout?: TableLayout,
    guictx?: GuiContext,
  ) {
    this.platform = platform;
    this.props = props;
    this.layout = layout ?? TableState.createInitialLayout(props.columnDefs);
    this.guictx = guictx ?? new GuiContext();

    this.updateClipRegions();
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

  private applyChanges(props: Partial<CanvasTableProps>) {
    this.layout.canvasWidth = this.platform.canvas.width;
    this.layout.canvasHeight = this.platform.canvas.height;

    if (props.columnDefs && !Object.is(props.columnDefs, this.props.columnDefs)) {
      this.props.columnDefs = props.columnDefs;
      this.layout.columnWidths = TableState.calculateColumnWidths(props.columnDefs);
    }

    if (props.dataRows && !Object.is(props.dataRows, this.props.dataRows)) {
      this.props.dataRows = props.dataRows;
    }

    if (props.theme && !Object.is(props.theme, this.props.theme)) {
      this.props.theme = props.theme;
    }

    if ('selectedRowId' in props) {
      this.props.selectedRowId = props.selectedRowId;
    }

    this.props.selectId = props.selectId ?? this.props.selectId;
    this.props.selectProp = props.selectProp ?? this.props.selectProp;
    this.props.onSelectRow = props.onSelectRow ?? this.props.onSelectRow;
    this.props.onResizeColumn = props.onResizeColumn ?? this.props.onResizeColumn;

    return this;
  }

  private updateScrollPos(scrollAmountX: number, scrollAmountY: number) {
    this.layout.scrollLeft = clamp(
      this.layout.scrollLeft + scrollAmountX,
      0,
      this.layout.maxScrollX,
    );
    this.layout.scrollTop = clamp(this.layout.scrollTop + scrollAmountY, 0, this.layout.maxScrollY);

    this.layout.hsbThumbX = this.calculateHorizontalScrollbarThumbX();
    this.layout.vsbThumbY = this.calculateVerticalScrollbarThumbY();
  }

  private updateClipRegions() {
    this.guictx.bodyAreaClipRegion = new Path2D();
    this.guictx.bodyAreaClipRegion.rect(
      this.layout.bodyAreaX,
      this.layout.bodyAreaY,
      this.layout.bodyAreaWidth,
      this.layout.bodyAreaHeight,
    );

    this.guictx.headAreaClipRegion = new Path2D();
    this.guictx.headAreaClipRegion.rect(
      this.layout.headAreaX,
      this.layout.headAreaY,
      this.layout.headAreaWidth,
      this.layout.headAreaHeight,
    );
  }

  public copy() {
    const props = Object.assign({}, this.props);
    const layout = Object.assign({}, this.layout);
    const newState = new TableState(this.platform, props, layout, this.guictx);
    return newState;
  }

  public update(props: Partial<CanvasTableProps>) {
    const newState = this.copy().applyChanges(props);

    const canvasSizeChanged =
      newState.layout.canvasWidth !== this.layout.canvasWidth ||
      newState.layout.canvasHeight !== this.layout.canvasHeight;

    const columnDefsChanged = !Object.is(newState.props.columnDefs, this.props.columnDefs);
    const dataRowsChanged = !Object.is(newState.props.dataRows, this.props.dataRows);
    const themeChanged = !Object.is(newState.props.theme, this.props.theme);

    const shouldRefreshLayout =
      canvasSizeChanged || columnDefsChanged || dataRowsChanged || themeChanged;
    if (shouldRefreshLayout) {
      newState.refreshLayout();
    }

    let scrollAmountX: number;
    let scrollAmountY: number;
    if (this.guictx.isNoWidgetActive()) {
      scrollAmountX = this.platform.scrollAmountX;
      scrollAmountY = this.platform.scrollAmountY;
    } else {
      scrollAmountX = 0;
      scrollAmountY = 0;
    }

    newState.updateScrollPos(scrollAmountX, scrollAmountY);

    const scrollPosChanged =
      newState.layout.scrollLeft !== this.layout.scrollLeft ||
      newState.layout.scrollTop !== this.layout.scrollTop;
    if (shouldRefreshLayout || scrollPosChanged) {
      newState.refreshViewport();
    }

    if (this.platform.mouseHasMoved) {
      newState.guictx.hoveredRowIndex = this.calculateHoveredRowIndex();
    }

    return newState;
  }

  public refreshLayout() {
    this.layout.shift =
      (this.props.theme.outerBorder !== undefined && this.props.theme.outerBorder) ||
      this.props.theme.border
        ? 1
        : 0;

    let scrollWidth = 0;
    for (const width of this.layout.columnWidths) {
      scrollWidth += width;
    }
    scrollWidth -= 1;

    const scrollHeight = this.props.dataRows.length * this.props.theme.rowHeight - 1;

    this.layout.scrollWidth = scrollWidth;
    this.layout.scrollHeight = scrollHeight;

    const tableOuterWidth = this.layout.canvasWidth - this.layout.shift * 2;
    const tableInnerWidth = tableOuterWidth - this.props.theme.scrollbarThickness;
    const tableOuterHeight = this.layout.canvasHeight - this.layout.shift * 2;
    const tableInnerHeight = tableOuterHeight - this.props.theme.scrollbarThickness;

    const bodyOuterWidth = tableOuterWidth;
    const bodyInnerWidth = tableInnerWidth;
    const bodyOuterHeight = tableOuterHeight - this.props.theme.rowHeight;
    const bodyInnerHeight = tableInnerHeight - this.props.theme.rowHeight;

    //const viewportOuterWidth = bodyOuterWidth - this.outerBorderWidth;
    //const viewportOuterHeight = bodyOuterHeight - this.outerBorderWidth;
    //const viewportInnerWidth = bodyInnerWidth - this.outerBorderWidth;
    //const viewportInnerHeight = bodyInnerHeight - this.outerBorderWidth;

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

    this.layout.tableAreaX = this.layout.shift;
    this.layout.tableAreaY = this.layout.shift;
    this.layout.tableAreaWidth = tableAreaWidth;
    this.layout.tableAreaHeight = tableAreaHeight;

    this.layout.bodyAreaX = this.layout.tableAreaX;
    this.layout.bodyAreaY = this.layout.tableAreaY + this.props.theme.rowHeight;
    this.layout.bodyAreaWidth = bodyAreaWidth;
    this.layout.bodyAreaHeight = bodyAreaHeight;

    this.layout.headAreaX = this.layout.tableAreaX;
    this.layout.headAreaY = this.layout.tableAreaY;
    this.layout.headAreaWidth = tableAreaWidth;
    this.layout.headAreaHeight = this.props.theme.rowHeight;

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
    this.layout.gridHeight = this.layout.bodyVisibleHeight + this.props.theme.rowHeight;

    this.layout.hsbX = this.layout.tableAreaX;
    this.layout.hsbY = this.layout.tableAreaY + this.layout.tableAreaHeight;
    this.layout.hsbWidth = this.layout.tableAreaWidth;
    this.layout.hsbHeight = this.props.theme.scrollbarThickness;

    this.layout.hsbTrackX = this.layout.hsbX + this.props.theme.scrollbarPadding;
    this.layout.hsbTrackY = this.layout.hsbY + this.props.theme.scrollbarPadding + BORDER_WIDTH;
    this.layout.hsbTrackWidth = this.layout.hsbWidth - this.props.theme.scrollbarPadding * 2;
    this.layout.hsbTrackHeight = this.layout.hsbHeight - this.props.theme.scrollbarPadding * 2;

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
    this.layout.vsbWidth = this.props.theme.scrollbarThickness;
    this.layout.vsbHeight = this.layout.bodyAreaHeight;

    this.layout.vsbTrackX = this.layout.vsbX + this.props.theme.scrollbarPadding + BORDER_WIDTH;
    this.layout.vsbTrackY = this.layout.vsbY + this.props.theme.scrollbarPadding;
    this.layout.vsbTrackWidth = this.layout.vsbWidth - this.props.theme.scrollbarPadding * 2;
    this.layout.vsbTrackHeight = this.layout.vsbHeight - this.props.theme.scrollbarPadding * 2;

    this.layout.vsbThumbX = this.layout.vsbTrackX;
    this.layout.vsbThumbWidth = this.layout.vsbTrackWidth;
    this.layout.vsbThumbHeight = Math.max(
      (bodyAreaHeight / this.layout.scrollHeightMinCapped) * this.layout.vsbTrackHeight,
      MIN_THUMB_LENGTH,
    );
    this.layout.vsbThumbMinY = this.layout.vsbTrackY;
    this.layout.vsbThumbMaxY =
      this.layout.vsbTrackY + this.layout.vsbTrackHeight - this.layout.vsbThumbHeight;

    this.updateClipRegions();
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

    this.layout.rowStart = Math.floor(this.layout.scrollTop / this.props.theme.rowHeight);
    this.layout.rowEnd = Math.min(
      Math.ceil((this.layout.scrollTop + this.layout.bodyAreaHeight) / this.props.theme.rowHeight),
      this.props.dataRows.length,
    );
  }

  public dragHorizontalScrollbarThumb() {
    const { dragDistanceX } = this.platform;
    const { hsbThumbMinX: min, hsbThumbMaxX: max } = this.layout;
    const { dragAnchorX } = this.guictx;

    this.layout.hsbThumbX = clamp(dragAnchorX + dragDistanceX, min, max);
    this.layout.scrollLeft = this.calculateScrollX(this.layout.hsbThumbX);

    this.refreshViewport();
  }

  public dragVerticalScrollbarThumb() {
    const { dragDistanceY } = this.platform;
    const { vsbThumbMinY: min, vsbThumbMaxY: max } = this.layout;
    const { dragAnchorY } = this.guictx;

    this.layout.vsbThumbY = clamp(dragAnchorY + dragDistanceY, min, max);
    this.layout.scrollTop = this.calculateScrollY(this.layout.vsbThumbY);

    this.refreshViewport();
  }

  public dragColumnResizer(columnIndex: number) {
    const { dragDistanceX } = this.platform;
    const { dragAnchorX } = this.guictx;

    const columnScrollLeft = this.calculateColumnScrollLeft(columnIndex);
    const columnScrollRight = dragAnchorX + dragDistanceX;
    const columnWidth = Math.max(columnScrollRight - columnScrollLeft + 1, MIN_COLUMN_WIDTH);

    this.resizeColumn(columnIndex, columnWidth);
  }

  public resizeColumn(columnIndex: number, columnWidth: number) {
    this.layout.columnWidths[columnIndex] = columnWidth;

    this.refreshLayout();

    this.layout.scrollLeft = Math.min(this.layout.scrollLeft, this.layout.maxScrollX);
    this.layout.scrollTop = Math.min(this.layout.scrollTop, this.layout.maxScrollY);

    this.refreshViewport();

    this.layout.hsbThumbX = this.calculateHorizontalScrollbarThumbX();
    this.layout.vsbThumbY = this.calculateVerticalScrollbarThumbY();

    const columnDef = this.props.columnDefs[columnIndex];
    this.props.onResizeColumn?.(columnDef.key, columnIndex, columnWidth);
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

  private calculateHoveredRowIndex() {
    const { currMouseY } = this.platform;

    const {
      bodyAreaX: x,
      bodyAreaY: y,
      bodyVisibleWidth: width,
      bodyVisibleHeight: height,
    } = this.layout;

    const { rowHeight } = this.props.theme;

    let mouseRow: number;
    if (this.platform.isMouseInRect(x, y, width, height)) {
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
    return rowIndex * this.props.theme.rowHeight;
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
    const { rowHeight } = this.props.theme;
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

  shift: 0,

  columnStart: 0,
  columnEnd: 0,
  rowStart: 0,
  rowEnd: 0,

  columnWidths: columnWidths ?? [],
  columnPositions: [] as number[],
});

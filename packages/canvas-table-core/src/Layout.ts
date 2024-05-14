import { clamp, lerp } from "./utils";
import {
  BORDER_WIDTH,
  MIN_THUMB_LENGTH,
  DEFAULT_COLUMN_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH
} from "./constants";
import { ColumnDef } from "./types";

export type Layout = ReturnType<typeof makeLayout>;

export const makeLayout = (columnDefs?: ColumnDef[]) => ({
  tableWidth: 1,
  tableHeight: 1,
  tableAreaX: 0,
  tableAreaY: 0,
  tableAreaWidth: 1,
  tableAreaHeight: 1,
  bodyAreaX: 0,
  bodyAreaY: 0,
  bodyAreaWidth: 1,
  bodyAreaHeight: 1,
  headerAreaX: 0,
  headerAreaY: 0,
  headerAreaWidth: 1,
  headerAreaHeight: 1,
  bodyVisibleWidth: 1,
  bodyVisibleHeight: 1,
  scrollX: 0,
  scrollY: 0,
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

  columnWidths: columnDefs ? calculateColumnWidths(columnDefs) : [],
  columnPositions: [] as number[]
});

export const refreshLayout = (
  layout: Layout,
  rowCount: number,
  rowHeight: number,
  scrollbarThickness: number,
  scrollbarTrackMargin: number
) => {
  let scrollWidth = 0;
  for (const width of layout.columnWidths) {
    scrollWidth += width;
  }

  layout.scrollWidth = scrollWidth;
  layout.scrollHeight = rowCount * rowHeight;

  const tableAreaOuterWidth  = layout.tableWidth  - BORDER_WIDTH;
  const tableAreaOuterHeight = layout.tableHeight - BORDER_WIDTH;

  const tableAreaInnerWidth  = tableAreaOuterWidth  - scrollbarThickness - BORDER_WIDTH;
  const tableAreaInnerHeight = tableAreaOuterHeight - scrollbarThickness - BORDER_WIDTH;

  const bodyAreaOuterHeight = tableAreaOuterHeight - rowHeight;
  const bodyAreaInnerHeight = tableAreaInnerHeight - rowHeight;

  if (tableAreaOuterWidth >= layout.scrollWidth && bodyAreaOuterHeight >= layout.scrollHeight) {
    layout.overflowX = layout.overflowY = false;
  } else {
    layout.overflowX = tableAreaInnerWidth < layout.scrollWidth;
    layout.overflowY = bodyAreaInnerHeight < layout.scrollHeight;
  }

  let tableAreaWidth: number;
  let bodyAreaWidth: number;

  if (layout.overflowY) {
    tableAreaWidth = bodyAreaWidth = tableAreaInnerWidth;
  } else {
    tableAreaWidth = bodyAreaWidth = tableAreaOuterWidth;
  }

  let tableAreaHeight: number;
  let bodyAreaHeight: number;

  if (layout.overflowX) {
    tableAreaHeight = tableAreaInnerHeight;
    bodyAreaHeight = bodyAreaInnerHeight;
  } else {
    tableAreaHeight = tableAreaOuterHeight;
    bodyAreaHeight = bodyAreaOuterHeight;
  }

  layout.tableAreaX = 0;
  layout.tableAreaY = 0;
  layout.tableAreaWidth = tableAreaWidth;
  layout.tableAreaHeight = tableAreaHeight;

  layout.bodyAreaX = 0;
  layout.bodyAreaY = rowHeight;
  layout.bodyAreaWidth = bodyAreaWidth;
  layout.bodyAreaHeight = bodyAreaHeight;

  layout.headerAreaX = 0;
  layout.headerAreaY = 0;
  layout.headerAreaWidth = tableAreaWidth;
  layout.headerAreaHeight = rowHeight;

  layout.scrollWidthMinCapped = Math.max(layout.scrollWidth, bodyAreaWidth);
  layout.scrollHeightMinCapped = Math.max(layout.scrollHeight, bodyAreaHeight);

  layout.maxScrollX = layout.scrollWidthMinCapped - bodyAreaWidth;
  layout.maxScrollY = layout.scrollHeightMinCapped - bodyAreaHeight;

  layout.bodyVisibleWidth = Math.min(layout.bodyAreaWidth, layout.scrollWidth);
  layout.bodyVisibleHeight = Math.min(layout.bodyAreaHeight, layout.scrollHeight);

  layout.hsbX = BORDER_WIDTH;
  layout.hsbY = tableAreaHeight + BORDER_WIDTH;
  layout.hsbWidth = tableAreaWidth - BORDER_WIDTH;
  layout.hsbHeight = scrollbarThickness;

  layout.hsbTrackX      = layout.hsbX      + scrollbarTrackMargin;
  layout.hsbTrackY      = layout.hsbY      + scrollbarTrackMargin;
  layout.hsbTrackWidth  = layout.hsbWidth  - scrollbarTrackMargin * 2;
  layout.hsbTrackHeight = layout.hsbHeight - scrollbarTrackMargin * 2;

  layout.hsbThumbY = layout.hsbTrackY;
  layout.hsbThumbHeight = layout.hsbTrackHeight;
  layout.hsbThumbWidth = Math.max((bodyAreaWidth / layout.scrollWidthMinCapped) * layout.hsbTrackWidth, MIN_THUMB_LENGTH);
  layout.hsbThumbMinX = layout.hsbTrackX;
  layout.hsbThumbMaxX = layout.hsbTrackX + layout.hsbTrackWidth - layout.hsbThumbWidth;

  layout.vsbX = tableAreaWidth + BORDER_WIDTH;
  layout.vsbY = rowHeight + BORDER_WIDTH;
  layout.vsbWidth = scrollbarThickness;
  layout.vsbHeight = bodyAreaHeight - BORDER_WIDTH;

  layout.vsbTrackX      = layout.vsbX      + scrollbarTrackMargin;
  layout.vsbTrackY      = layout.vsbY      + scrollbarTrackMargin;
  layout.vsbTrackWidth  = layout.vsbWidth  - scrollbarTrackMargin * 2;
  layout.vsbTrackHeight = layout.vsbHeight - scrollbarTrackMargin * 2;

  layout.vsbThumbX = layout.vsbTrackX;
  layout.vsbThumbWidth = layout.vsbTrackWidth;
  layout.vsbThumbHeight = Math.max((bodyAreaHeight / layout.scrollHeightMinCapped) * layout.vsbTrackHeight, MIN_THUMB_LENGTH);
  layout.vsbThumbMinY = layout.vsbTrackY;
  layout.vsbThumbMaxY = layout.vsbTrackY + layout.vsbTrackHeight - layout.vsbThumbHeight;
};

export const refreshViewport = (layout: Layout, rowCount: number, rowHeight: number) => {
  let columnPos = 0;
  layout.columnPositions = [];

  for (layout.columnStart = 0; layout.columnStart < layout.columnWidths.length; layout.columnStart++) {
    const column_width = layout.columnWidths[layout.columnStart];
    const nextColumnPos = columnPos + column_width;
    if (nextColumnPos > layout.scrollX) {
      break;
    }
    layout.columnPositions.push(columnPos);
    columnPos = nextColumnPos;
  }

  for (layout.columnEnd = layout.columnStart; layout.columnEnd < layout.columnWidths.length; layout.columnEnd++) {
    if (columnPos >= layout.scrollX + layout.bodyAreaWidth) {
      break;
    }

    layout.columnPositions.push(columnPos);
    columnPos += layout.columnWidths[layout.columnEnd];
  }

  layout.rowStart = Math.floor(layout.scrollY / rowHeight);
  layout.rowEnd = Math.min(Math.ceil((layout.scrollY + layout.bodyAreaHeight) / rowHeight), rowCount);
};

export const updateScrollPos = (layout: Layout, scrollAmountX: number, scrollAmountY: number) => {
  layout.scrollX = clamp(layout.scrollX + scrollAmountX, 0, layout.maxScrollX);
  layout.scrollY = clamp(layout.scrollY + scrollAmountY, 0, layout.maxScrollY);

  layout.hsbThumbX = calculateHorizontalScrollbarThumbX(layout);
  layout.vsbThumbY = calculateVerticalScrollbarThumbY(layout);
};

export const calculateHorizontalScrollbarThumbX = (layout: Layout) => {
  return Math.round(lerp(layout.scrollX, 0, layout.maxScrollX, layout.hsbThumbMinX, layout.hsbThumbMaxX));
};

export const calculateVerticalScrollbarThumbY = (layout: Layout) => {
  return Math.round(lerp(layout.scrollY, 0, layout.maxScrollY, layout.vsbThumbMinY, layout.vsbThumbMaxY));
};

export const calculateResizerScrollX = (layout: Layout, columnIndex: number) => {
  const columnWidth = layout.columnWidths[columnIndex];
  const columnScrollLeft = calculateColumnScrollX(layout, columnIndex);
  const columnScrollRight = columnScrollLeft + columnWidth;
  const resizerScrollLeft = Math.min(
    columnScrollRight - COLUMN_RESIZER_LEFT_WIDTH,
    layout.scrollWidthMinCapped - COLUMN_RESIZER_WIDTH
  );
  return resizerScrollLeft;
};

export const calculateColumnScrollX = (layout: Layout, columnIndex: number) => {
  return layout.columnPositions[columnIndex];
};

export const calculateRowScrollY = (rowIndex: number, rowHeight: number) => {
  return rowIndex * rowHeight;
};

export const calculateColumnScreenX = (layout: Layout, columnIndex: number) => {
  const columnScrollX = calculateColumnScrollX(layout, columnIndex);
  const columnScreenX = scrollToScreenX(layout, columnScrollX);
  return columnScreenX;
};

export const calculateRowScreenY = (layout: Layout, rowIndex: number, rowHeight: number) => {
  const rowScrollY = calculateRowScrollY(rowIndex, rowHeight);
  const rowScreenY = scrollToScreenY(layout, rowScrollY) + rowHeight;
  return rowScreenY;
};

export const scrollToScreenX = (layout: Layout, scrollX: number) => {
  return scrollX - layout.scrollX;
};

export const scrollToScreenY = (layout: Layout, scrollY: number) => {
  return scrollY - layout.scrollY;
};

export const screenToScrollX = (layout: Layout, screenX: number) => {
  return screenX + layout.scrollX;
};

export const screenToScrollY = (layout: Layout, screenY: number) => {
  return screenY + layout.scrollY;
};

export const calculateScrollX = (layout: Layout, hsbThumbX: number) => {
  return Math.round(lerp(hsbThumbX, layout.hsbThumbMinX, layout.hsbThumbMaxX, 0, layout.maxScrollX));
};

export const calculateScrollY = (layout: Layout, vsbThumbY: number) => {
  return Math.round(lerp(vsbThumbY, layout.vsbThumbMinY, layout.vsbThumbMaxY, 0, layout.maxScrollY));
};

export const calculateColumnWidths = (columnDefs: ColumnDef[]) => {
  const columnWidths = [] as number[];
  for (const { width } of columnDefs) {
    columnWidths.push(width ?? DEFAULT_COLUMN_WIDTH);
  }
  return columnWidths;
};

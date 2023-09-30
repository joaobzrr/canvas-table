import { clamp, createRect, createVector, createSize } from "./utils";
import { MIN_THUMB_LENGTH, BORDER_WIDTH } from "./constants";
import { TableState, ColumnState, DataRow, Theme, Size } from "./types";

export function tableStateCreate(
  columnStates:  ColumnState[],
  dataRows: DataRow[],
  theme: Theme,
  canvasSize: Size
): TableState {
  const { rowHeight } = theme;

  const bodyRect   = createRect({ y: rowHeight });
  const headerRect = createRect({ height: rowHeight });

  const tableState = {
    columnStates,
    dataRows,
    theme,
    mainRect: createRect(),
    bodyRect,
    headerRect,
    scrollPos: createVector(),
    maxScrollPos: createVector(),
    normalizedScrollPos: createVector(),
    canvasSize,
    scrollSize: createSize(),
    viewportSize: createSize(),
    normalizedViewportSize: createSize(),
    overflowX: false,
    overflowY: false,
  } as TableState;

  updateScrollbarGeometry(tableState);
  updateContentSize(tableState);
  updateTableRanges(tableState);
  updateGridSize(tableState);
  updateGridPositions(tableState);

  return tableState;
}

export function tableStateSetContent(
  tableState: TableState,
  columnStates: ColumnState[],
  dataRows: DataRow[]
) {
  tableState.columnStates = columnStates;
  tableState.dataRows = dataRows;

  updateContentSize(tableState);

  reflow(tableState);

  updateTableRanges(tableState);
  updateGridPositions(tableState);
}

export function tableStateSetSize(tableState: TableState, size: Size) {
  tableState.canvasSize = size;

  reflow(tableState);

  updateTableRanges(tableState);
  updateGridPositions(tableState);
}

export function tableStateSetTheme(tableState: TableState, theme: Theme) {
  tableState.theme = theme;

  updateContentSize(tableState);

  reflow(tableState);

  updateTableRanges(tableState);
  updateGridPositions(tableState);
}

function reflow(tableState: TableState) {
  const {
    canvasSize,
    contentSize,
    mainRect,
    bodyRect,
    headerRect,
    scrollPos,
    theme
  } = tableState;

  const { rowHeight, scrollbarThickness } = theme;

  const outerMainRectWidth  = canvasSize.width  - BORDER_WIDTH;
  const outerMainRectHeight = canvasSize.height - BORDER_WIDTH;
  const innerMainRectWidth  = outerMainRectWidth  - scrollbarThickness - BORDER_WIDTH;
  const innerMainRectHeight = outerMainRectHeight - scrollbarThickness - BORDER_WIDTH;

  const outerBodyRectHeight = outerMainRectHeight - rowHeight;
  const innerBodyRectHeight = innerMainRectHeight - rowHeight;

  let overflowX: boolean;
  let overflowY: boolean;
  if (outerMainRectWidth >= contentSize.width && outerBodyRectHeight >= contentSize.height) {
    overflowX = overflowY = false;
  } else {
    overflowX = innerMainRectWidth  < contentSize.width;
    overflowY = innerBodyRectHeight < contentSize.height;
  }

  tableState.overflowX = overflowX;
  tableState.overflowY = overflowY;

  if (overflowY) {
    mainRect.width = bodyRect.width = headerRect.width = innerMainRectWidth;
  } else {
    mainRect.width = bodyRect.width = headerRect.width = outerMainRectWidth;
  }

  if (overflowX) {
    mainRect.height = innerMainRectHeight;
    bodyRect.height = innerBodyRectHeight;
  } else {
    mainRect.height = outerMainRectHeight;
    bodyRect.height = outerBodyRectHeight;
  }

  updateScrollbarGeometry(tableState);

  const viewportSize = { width: bodyRect.width, height: bodyRect.height };
  tableState.viewportSize = viewportSize;

  const scrollWidth  = Math.max(contentSize.width,  viewportSize.width);
  const scrollHeight = Math.max(contentSize.height, viewportSize.height);
  const scrollSize = { width: scrollWidth, height: scrollHeight };
  tableState.scrollSize = scrollSize;

  const normalizedViewportWidth  = viewportSize.width  / scrollWidth;
  const normalizedViewportHeight = viewportSize.height / scrollHeight;
  const normalizedViewportSize = {
    width:  normalizedViewportWidth,
    height: normalizedViewportHeight
  };
  tableState.normalizedViewportSize = normalizedViewportSize;

  const maxScrollLeft = scrollWidth  - viewportSize.width;
  const maxScrollTop  = scrollHeight - viewportSize.height;
  const maxScrollPos = { x: maxScrollLeft, y: maxScrollTop };
  tableState.maxScrollPos = maxScrollPos;

  const scrollLeft = Math.round(clamp(scrollPos.x, 0, maxScrollLeft));
  const scrollTop  = Math.round(clamp(scrollPos.y, 0, maxScrollTop));
  tableState.scrollPos = { x: scrollLeft, y: scrollTop };

  const normalizedScrollX = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
  const normalizedScrollY = maxScrollTop  > 0 ? scrollTop  / maxScrollTop  : 0;
  const normalizedScrollPos = {
    x: normalizedScrollX,
    y: normalizedScrollY
  };
  tableState.normalizedScrollPos = normalizedScrollPos;

  updateGridSize(tableState);
}

function updateScrollbarGeometry(tableState: TableState) {
  const { mainRect, bodyRect, theme, normalizedViewportSize } = tableState;
  const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = theme;

  const outerThickness = scrollbarThickness + BORDER_WIDTH ;

  const hsbOuterRect = createRect({
    y: mainRect.height,
    width: mainRect.width,
    height: outerThickness
  });
  tableState.hsbOuterRect = hsbOuterRect;

  const hsbInnerRect = createRect({
    x: BORDER_WIDTH,
    y: hsbOuterRect.y + BORDER_WIDTH,
    width: hsbOuterRect.width - BORDER_WIDTH,
    height: scrollbarThickness
  });
  tableState.hsbInnerRect = hsbInnerRect;

  const hsbTrackRectX = hsbInnerRect.x + scrollbarTrackMargin;
  const hsbTrackRectY = hsbInnerRect.y + scrollbarTrackMargin;
  const hsbTrackRectWidth =  hsbInnerRect.width  - (scrollbarTrackMargin * 2);
  const hsbTrackRectHeight = hsbInnerRect.height - (scrollbarTrackMargin * 2);
  const hsbTrackRect = createRect({
    x: hsbTrackRectX,
    y: hsbTrackRectY,
    width: hsbTrackRectWidth,
    height: hsbTrackRectHeight
  });
  tableState.hsbTrackRect = hsbTrackRect;

  const hsbThumbRectWidth = Math.max(
    normalizedViewportSize.width * hsbTrackRectWidth, MIN_THUMB_LENGTH);
  const hsbThumbRect = {
    ...hsbTrackRect,
    width: hsbThumbRectWidth
  };
  tableState.hsbThumbRect = hsbThumbRect;

  const vsbOuterRect = createRect({
    x: mainRect.width,
    y: rowHeight,
    width: outerThickness,
    height: bodyRect.width
  });
  tableState.vsbOuterRect = vsbOuterRect;

  const vsbInnerRect = createRect({
    x: vsbOuterRect.x + BORDER_WIDTH,
    y: rowHeight + BORDER_WIDTH,
    width: scrollbarThickness,
    height: vsbOuterRect.height - BORDER_WIDTH
  });
  tableState.vsbInnerRect = vsbInnerRect;

  const vsbTrackRectX = vsbInnerRect.x + scrollbarTrackMargin;
  const vsbTrackRectY = vsbInnerRect.y + scrollbarTrackMargin;
  const vsbTrackRectWidth =  vsbInnerRect.width  - (scrollbarTrackMargin * 2);
  const vsbTrackRectHeight = vsbInnerRect.height - (scrollbarTrackMargin * 2);
  const vsbTrackRect = createRect({
    x: vsbTrackRectX,
    y: vsbTrackRectY,
    width: vsbTrackRectWidth,
    height: vsbTrackRectHeight
  });
  tableState.vsbTrackRect = vsbTrackRect;

  const vsbThumbRectHeight = Math.max(
    normalizedViewportSize.height * vsbTrackRectHeight, MIN_THUMB_LENGTH);
  const vsbThumbRect = {
    ...vsbTrackRect,
    height: vsbThumbRectHeight
  };
  tableState.vsbThumbRect = vsbThumbRect;
}

function updateGridPositions(tableState: TableState) {
  const { columnStates, scrollPos, tableRanges, theme } = tableState;
  const { rowHeight } = theme;

  const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;
  const { x: scrollLeft, y: scrollTop } = scrollPos;

  const columnPositions = [];
  {
    const offset = -scrollLeft;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = columnStates[j];
      const x = columnState.pos + offset;
      columnPositions.push(x);
    }
  }
  tableState.columnPositions = columnPositions;

  const rowPositions = [];
  {
    const offset = -scrollTop + rowHeight;
    for (let i = rowTop; i < rowBottom; i++) {
      const y = i * rowHeight + offset;
      rowPositions.push(y);
    }
  }
  tableState.rowPositions = rowPositions;
}

function updateTableRanges(tableState: TableState) {
  const { columnStates, dataRows, scrollPos, contentSize, viewportSize, theme } = tableState;
  const { rowHeight } = theme;

  const { x: scrollLeft, y: scrollTop } = scrollPos;
  const { width: viewportWidth, height: viewportHeight } = viewportSize;

  const scrollRight  = scrollLeft + viewportWidth;
  const scrollBottom = scrollTop  + viewportHeight;

  let columnLeft = findColumnIndexAtPosition(columnStates, contentSize, scrollLeft);
  if (columnLeft === -1) columnLeft = 0;

  let columnRight = findColumnIndexAtPosition(columnStates, contentSize, scrollRight, columnLeft);
  columnRight = columnRight !== -1 ? columnRight + 1 : columnStates.length;

  const rowTop = Math.floor(scrollTop / rowHeight);
  const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), dataRows.length);

  const tableRanges = { columnLeft, columnRight, rowTop, rowBottom };
  tableState.tableRanges = tableRanges;
}

function findColumnIndexAtPosition(
  columnStates: ColumnState[],
  contentSize: Size,
  x: number,
  start = 0
) {
  if (start < 0 || start >= columnStates.length) {
    throw new Error("Index out of bounds");
  }

  if (x >= contentSize.width) return -1;
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

function updateContentSize(tableState: TableState) {
  const { columnStates, dataRows, theme } = tableState;
  const { rowHeight } = theme;

  const lastColumnStateIndex = columnStates.length - 1;
  const lastColumnState = columnStates[lastColumnStateIndex];

  const numberOfRows = dataRows.length;

  const contentWidth = lastColumnState.pos + lastColumnState.width;
  const contentHeight = numberOfRows * rowHeight;
  const contentSize = createSize(contentWidth, contentHeight);

  tableState.contentSize = contentSize;
}

function updateGridSize(tableState: TableState) {
  const { mainRect, contentSize, theme } = tableState;
  const { rowHeight } = theme;

  const { width: mainRectWidth, height: mainRectHeight } = mainRect;
  const { width: contentWidth, height: contentHeight } = contentSize;

  const gridWidth = Math.min(mainRectWidth, contentWidth);
  const gridHeight = Math.min(mainRectHeight, contentHeight + rowHeight);
  const gridSize = { width: gridWidth, height: gridHeight };

  tableState.gridSize = gridSize;
}

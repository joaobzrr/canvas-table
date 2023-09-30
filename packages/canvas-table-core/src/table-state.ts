import { clamp, createRect, createVector, createSize } from "./utils";
import { BORDER_WIDTH } from "./constants";
import {
  TableState,
  ColumnState,
  DataRow,
  Theme,
  RectLike,
  VectorLike,
  TableRanges,
  Size,
} from "./types";

export function tableStateCreate(
  columnStates:  ColumnState[],
  dataRows: DataRow[],
  theme: Theme,
  canvasSize: Size
): TableState {
  const { rowHeight, scrollbarThickness } = theme;

  const mainRect   = createRect();
  const bodyRect   = createRect({ y: rowHeight });
  const headerRect = createRect({ height: rowHeight });

  const outerThickness = scrollbarThickness + BORDER_WIDTH ;
  const hsbOuterRect = createRect({ height: outerThickness });
  const vsbOuterRect = createRect({ y: rowHeight, width: outerThickness });

  const hsbInnerRect = createRect({ x: BORDER_WIDTH, height: scrollbarThickness });
  const vsbInnerRect = createRect({ y: rowHeight + BORDER_WIDTH, width: scrollbarThickness });

  const scrollPos           = createVector();
  const maxScrollPos        = createVector();
  const normalizedScrollPos = createVector();

  const lastColumnStateIndex = columnStates.length - 1;
  const lastColumnState = columnStates[lastColumnStateIndex];

  const numberOfRows = dataRows.length;

  const contentSize = calculateContentSize(lastColumnState, numberOfRows, rowHeight);

  const gridSize = calculateGridSize(mainRect, contentSize, rowHeight);

  const scrollSize             = createSize();
  const viewportSize           = createSize();
  const normalizedViewportSize = createSize();

  const tableRanges = { columnLeft: 0, columnRight: 0, rowTop: 0, rowBottom: 0 };

  const gridPositions = calculateGridPositions(columnStates, scrollPos, tableRanges, rowHeight);

  return {
    columnStates,
    dataRows,
    theme,
    mainRect,
    bodyRect,
    hsbOuterRect,
    vsbOuterRect,
    hsbInnerRect,
    vsbInnerRect,
    headerRect,
    scrollPos,
    maxScrollPos,
    normalizedScrollPos,
    canvasSize,
    contentSize,
    gridSize,
    scrollSize,
    viewportSize,
    normalizedViewportSize,
    overflowX: false,
    overflowY: false,
    tableRanges,
    gridPositions,
  };
}

export function tableStateSetContent(
  tableState: TableState,
  columnStates: ColumnState[],
  dataRows: DataRow[]
) {
  tableState.columnStates = columnStates;
  tableState.dataRows = dataRows;

  const lastColumnStateIndex = columnStates.length - 1;
  const lastColumnState = columnStates[lastColumnStateIndex];

  const numberOfRows = dataRows.length;

  const { theme } = tableState;
  const { rowHeight } = theme;

  const contentSize = calculateContentSize(lastColumnState, numberOfRows, rowHeight);
  tableState.contentSize = contentSize;

  reflow(tableState);

  const { scrollPos, viewportSize } = tableState;

  const tableRanges = calculateTableRanges(
    columnStates, dataRows, scrollPos, contentSize, viewportSize, rowHeight);
  tableState.tableRanges = tableRanges;

  const gridPositions = calculateGridPositions(columnStates, scrollPos, tableRanges, rowHeight);
  tableState.gridPositions = gridPositions;
}

export function tableStateSetSize(tableState: TableState, size: Size) {
  tableState.canvasSize = size;

  reflow(tableState);

  const { columnStates, dataRows, scrollPos, contentSize, viewportSize, theme } = tableState;
  const { rowHeight } = theme;

  const tableRanges = calculateTableRanges(
    columnStates, dataRows, scrollPos, contentSize, viewportSize, rowHeight);
  tableState.tableRanges = tableRanges;

  const gridPositions = calculateGridPositions(columnStates, scrollPos, tableRanges, rowHeight);
  tableState.gridPositions = gridPositions;
}

export function tableStateSetTheme(tableState: TableState, theme: Theme) {
  tableState.theme = theme;

  const { columnStates, dataRows } = tableState;

  const lastColumnStateIndex = columnStates.length - 1;
  const lastColumnState = columnStates[lastColumnStateIndex];

  const numberOfRows = dataRows.length;

  const { rowHeight } = theme;

  const contentSize = calculateContentSize(lastColumnState, numberOfRows, rowHeight);
  tableState.contentSize = contentSize;

  reflow(tableState);

  const { scrollPos, viewportSize } = tableState;

  const tableRanges = calculateTableRanges(
    columnStates, dataRows, scrollPos, contentSize, viewportSize, rowHeight);
  tableState.tableRanges = tableRanges;

  const gridPositions = calculateGridPositions(columnStates, scrollPos, tableRanges, rowHeight);
  tableState.gridPositions = gridPositions;
}

function reflow(tableState: TableState) {
  const {
    canvasSize,
    contentSize,
    mainRect,
    bodyRect,
    headerRect,
    hsbOuterRect,
    hsbInnerRect,
    vsbOuterRect,
    vsbInnerRect,
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

  hsbOuterRect.y     = mainRect.height;
  hsbOuterRect.width = mainRect.width;
  hsbInnerRect.y     = hsbOuterRect.y     + BORDER_WIDTH;
  hsbInnerRect.width = hsbOuterRect.width - BORDER_WIDTH;

  vsbOuterRect.x      = mainRect.width;
  vsbOuterRect.height = bodyRect.height;
  vsbInnerRect.x      = vsbOuterRect.x      + BORDER_WIDTH;
  vsbInnerRect.height = vsbOuterRect.height - BORDER_WIDTH;

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

  const gridSize = calculateGridSize(mainRect, contentSize, rowHeight);
  tableState.gridSize = gridSize;
}

function calculateGridPositions(
  columnStates: ColumnState[],
  scrollPos: VectorLike,
  tableRanges: TableRanges,
  rowHeight: number
) {
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

  const rowPositions = [];
  {
    const offset = -scrollTop + rowHeight;
    for (let i = rowTop; i < rowBottom; i++) {
      const y = i * rowHeight + offset;
      rowPositions.push(y);
    }
  }

  return {
    columns: columnPositions,
    rows: rowPositions
  };
}

function calculateTableRanges(
  columnStates: ColumnState[],
  dataRows: DataRow[],
  scrollPos: VectorLike,
  contentSize: Size,
  viewportSize: Size,
  rowHeight: number
) {
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

  return {
    columnLeft,
    columnRight,
    rowTop,
    rowBottom
  };
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

function calculateContentSize(
  lastColumnState: ColumnState,
  numberOfRows: number,
  rowHeight: number,
) {
  const contentWidth = lastColumnState.pos + lastColumnState.width;
  const contentHeight = numberOfRows * rowHeight;
  return createSize(contentWidth, contentHeight);
}

function calculateGridSize(mainRect: RectLike, contentSize: Size, rowHeight: number): Size {
  const { width: mainRectWidth, height: mainRectHeight } = mainRect;
  const { width: contentWidth, height: contentHeight } = contentSize;

  const gridWidth = Math.min(mainRectWidth, contentWidth);
  const gridHeight = Math.min(mainRectHeight, contentHeight + rowHeight);

  return { width: gridWidth, height: gridHeight };
}

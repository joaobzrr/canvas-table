import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";
import { defaultTheme } from "./defaultTheme";
import {
  shallowMerge,
  scale,
  clamp,
  createRect,
  createVector,
  createSize,
  fillRect,
  clearRect,
  clipRect,
  pointInRect
} from "./utils";
import {
  DEFAULT_COLUMN_WIDTH,
  MIN_THUMB_LENGTH,
  COLUMN_RESIZER_WIDTH,
  BORDER_WIDTH,
} from "./constants";
import {
  CanvasTable,
  CanvasTableParams,
  ColumnDef,
  ColumnState,
  DataRow,
  VectorLike,
  Size,
  Theme,
} from "./types";

export function create(params: CanvasTableParams): CanvasTable {
  const { container, columnDefs, dataRows, size } = params;

  const columnStates = columnDefsToColumnStates(columnDefs);

  const theme = { ...defaultTheme, ...params.theme };

  const canvasSize = createSize(size);

  const containerEl = document.getElementById(container);
  if (!containerEl) {
    throw new Error(`Element with id "${params.container}" could not be found`);
  }

  containerEl.replaceChildren();
  containerEl.style.overflow = "hidden";

  const wrapperEl = document.createElement("div");
  wrapperEl.classList.add("canvas-table-wrapper");
  containerEl.appendChild(wrapperEl);

  const canvas = document.createElement("canvas");
  canvas.width  = canvasSize.width;
  canvas.height = canvasSize.height;
  wrapperEl.appendChild(canvas);

  const lineRenderer = new LineRenderer();
  const textRenderer = new TextRenderer();

  const mousePos = createVector();

  const { rowHeight } = theme;

  const bodyRect   = createRect({ y: rowHeight });
  const headerRect = createRect({ height: rowHeight });

  const mainRect = createRect();

  const scrollPos = createVector();
  const maxScrollPos = createVector();
  const normalizedScrollPos = createVector();

  const scrollSize = createSize();
  const viewportSize = createSize();
  const normalizedViewportSize = createSize();

  const hsbTrackRect = createRect();
  const hsbThumbRect = createRect();
  const hsbMaxThumbPos = 0;
  const hsbDragOffset = 0;
  const hsbIsDragging = false;

  const vsbTrackRect = createRect();
  const vsbThumbRect = createRect();
  const vsbMaxThumbPos = 0;
  const vsbDragOffset = 0;
  const vsbIsDragging = false;

  const indexOfColumnWhoseResizerIsBeingHovered = -1;
  const indexOfColumnBeingResized = -1;

  const tableRanges = { columnLeft: 0, columnRight: 0, rowTop: 0, rowBottom: 0 };

  const overflowX = false;
  const overflowY = false;

  const ct = {
    canvas,
    containerEl,
    wrapperEl,
    lineRenderer,
    textRenderer,
    mousePos,
    columnStates,
    dataRows,
    theme,
    mainRect,
    bodyRect,
    headerRect,
    hsbTrackRect,
    hsbThumbRect,
    hsbMaxThumbPos,
    hsbDragOffset,
    hsbIsDragging,
    vsbTrackRect,
    vsbThumbRect,
    vsbMaxThumbPos,
    vsbDragOffset,
    vsbIsDragging,
    indexOfColumnWhoseResizerIsBeingHovered,
    indexOfColumnBeingResized,
    scrollPos,
    maxScrollPos,
    normalizedScrollPos,
    scrollSize,
    viewportSize,
    normalizedViewportSize,
    tableRanges,
    overflowX,
    overflowY
  } as CanvasTable;

  updateContentSize(ct);
  reflow(ct);
  updateScreenData(ct);

  updateFonts(ct);

  ct.mouseDownHandler = (e) => onMouseDown(ct, e);
  ct.mouseUpHandler   = (e) => onMouseUp(ct, e);
  ct.mouseMoveHandler = (e) => onMouseMove(ct, e);
  ct.wheelHandler     = (e) => onWheel(ct, e);

  canvas.addEventListener("mousedown", ct.mouseDownHandler);
  canvas.addEventListener("wheel", ct.wheelHandler);

  document.addEventListener("mousemove", ct.mouseMoveHandler);
  document.addEventListener("mouseup", ct.mouseUpHandler);

  return ct;
}

export function setContent(
  ct: CanvasTable,
  columnDefs: ColumnDef[],
  dataRows: DataRow[]
) {
  const columnStates = columnDefsToColumnStates(columnDefs);
  ct.columnStates = columnStates;

  ct.dataRows = dataRows;

  updateContentSize(ct);
  reflow(ct);
  updateScreenData(ct);

  render(ct);
}

export function setSize(ct: CanvasTable, size: Size) {
  if (size.width <= 0 || size.height <= 0) {
    return;
  }

  const { canvas } = ct;

  canvas.width  = size.width;
  canvas.height = size.height;

  reflow(ct);
  updateScreenData(ct);

  render(ct);
}

export function setTheme(ct: CanvasTable, theme: Partial<Theme>) {
  const _theme = shallowMerge<Theme>({}, defaultTheme, theme);
  ct.theme = _theme;

  updateContentSize(ct);
  reflow(ct);
  updateScreenData(ct);

  updateFonts(ct);

  const { lineRenderer } = ct;
  const { tableBorderColor } = _theme;

  lineRenderer.setColor(tableBorderColor);

  render(ct);
}

export function cleanup(ct: CanvasTable) {
  const { mouseMoveHandler, mouseUpHandler } = ct;

  document.removeEventListener("mousemove", mouseMoveHandler);
  document.removeEventListener("mouseup", mouseUpHandler);
}

function onMouseDown(ct: CanvasTable, event: MouseEvent) {
  const { wrapperEl, hsbThumbRect, vsbThumbRect } = ct;

  const eventPos = { x: event.clientX, y: event.clientY };

  const mousePos = getRelativeMousePos(wrapperEl, eventPos);
  const { x: mouseX, y: mouseY } = mousePos;

  const { x: hsbThumbX } = hsbThumbRect;

  const hsbIsDragging = pointInRect(mousePos, hsbThumbRect);
  if (hsbIsDragging) {
    ct.hsbDragOffset = mouseX - hsbThumbX;
  }
  ct.hsbIsDragging = hsbIsDragging;

  const { y: vsbThumbY } = vsbThumbRect;

  const vsbIsDragging = pointInRect(mousePos, vsbThumbRect);
  if (vsbIsDragging) {
    ct.vsbDragOffset = mouseY - vsbThumbY;
  }
  ct.vsbIsDragging = vsbIsDragging;

  const { indexOfColumnWhoseResizerIsBeingHovered } = ct;
  if (indexOfColumnWhoseResizerIsBeingHovered !== -1) {
    ct.indexOfColumnBeingResized = indexOfColumnWhoseResizerIsBeingHovered;
  }
}

function onMouseUp(ct: CanvasTable, _event: MouseEvent) {
  let shouldUpdate = false;

  ct.hsbIsDragging = false;
  ct.vsbIsDragging = false;

  {
    const { indexOfColumnBeingResized: oldIndex } = ct;
    const newIndex = -1;
    if (newIndex !== oldIndex) {
      ct.indexOfColumnBeingResized = newIndex;
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    render(ct);
  }
}

function onMouseMove(ct: CanvasTable, event: MouseEvent) {
  const { wrapperEl }  = ct;

  const eventPos = { x: event.clientX, y: event.clientY }

  const mousePos = getRelativeMousePos(wrapperEl, eventPos);
  const { x: mouseX, y: mouseY } = mousePos;

  let shouldUpdate = false;

  const {
    scrollPos,
    maxScrollPos,
    normalizedScrollPos,
    hsbTrackRect,
    hsbThumbRect,
    hsbMaxThumbPos,
    hsbDragOffset,
    hsbIsDragging
  } = ct;

  const { x: maxScrollLeft } = maxScrollPos;
  const { x: hsbTrackX } = hsbTrackRect;

  if (hsbIsDragging) {
    const hsbThumbX = clamp(mouseX - hsbDragOffset, hsbTrackX, hsbMaxThumbPos);
    hsbThumbRect.x = hsbThumbX;

    const normScrollLeft = scale(hsbThumbX, hsbTrackX, hsbMaxThumbPos, 0, 1);
    normalizedScrollPos.x = normScrollLeft;

    const scrollLeft = Math.round(scale(normScrollLeft, 0, 1, 0, maxScrollLeft));
    scrollPos.x = scrollLeft;

    shouldUpdate = true;
  }

  const {
    vsbTrackRect,
    vsbThumbRect,
    vsbMaxThumbPos,
    vsbDragOffset,
    vsbIsDragging
  } = ct;

  const { y: maxScrollTop } = maxScrollPos;
  const { y: vsbTrackY } = vsbTrackRect;

  if (vsbIsDragging) {
    const vsbThumbY = clamp(mouseY - vsbDragOffset, vsbTrackY, vsbMaxThumbPos);
    vsbThumbRect.y = vsbThumbY;

    const normScrollTop = scale(vsbThumbY, vsbTrackY, vsbMaxThumbPos, 0, 1);
    normalizedScrollPos.y = normScrollTop;

    const scrollTop = Math.round(scale(normScrollTop, 0, 1, 0, maxScrollTop));
    scrollPos.y = scrollTop;

    shouldUpdate = true;
  }

  {
    const { indexOfColumnWhoseResizerIsBeingHovered: oldIndex } = ct;

    const newIndex = findIndexOfColumnWhoseResizerIsBeingHovered(ct, mousePos);
    if (newIndex !== oldIndex) {
      ct.indexOfColumnWhoseResizerIsBeingHovered = newIndex;
      shouldUpdate = true;
    }
  }

  // const { columnStates, columnPositions, indexOfColumnBeingResized, tableRanges } = ct;
  // const { columnLeft } = tableRanges;

  // if (indexOfColumnBeingResized) {
  //   const columnState = columnStates[indexOfColumnBeingResized];
  //   const { width: columnWidth } = columnState;

  //   const columnPositionIndex = indexOfColumnBeingResized - columnLeft;
  //   const columnPosition = columnPositions[columnPositionIndex];

  //   const x = columnPosition + columnWidth;
  // }

  if (shouldUpdate) {
    updateScreenData(ct);
    render(ct);
  }
}

function onWheel(_ct: CanvasTable, _event: WheelEvent) {
}

function render(ct: CanvasTable) {
  const {
    canvas,
    lineRenderer,
    textRenderer,
    bodyFont,
    headerFont,
    theme,
    mainRect,
    bodyRect,
    headerRect,
    hsbOuterRect,
    hsbThumbRect,
    vsbOuterRect,
    vsbThumbRect,
    columnStates,
    dataRows,
    tableRanges,
    columnPositions,
    rowPositions,
    contentSize,
    overflowX,
    overflowY,
    indexOfColumnWhoseResizerIsBeingHovered,
    indexOfColumnBeingResized,
  } = ct;

  const {
    tableBackgroundColor
  } = theme;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate context");
  }

  // Draw or clear table background
  const canvasRect = createRect(0, 0, canvas.width, canvas.height);
  if (tableBackgroundColor) {
    ctx.fillStyle = tableBackgroundColor;
    fillRect(ctx, canvasRect);
  } else {
    clearRect(ctx, canvasRect);
  }

  // Draw body background
  const { bodyBackgroundColor = tableBackgroundColor } = theme;
  if (bodyBackgroundColor) {
    ctx.fillStyle = bodyBackgroundColor;
    fillRect(ctx, bodyRect);
  }

  // Draw header background
  const { headerBackgroundColor = tableBackgroundColor } = theme;
  if (headerBackgroundColor) {
    ctx.fillStyle = headerBackgroundColor;
    fillRect(ctx, headerRect);
  }

  // Draw scrollbar background and thumb
  const { scrollbarTrackColor, scrollbarThumbColor } = theme;
  if (overflowX) {
    if (scrollbarTrackColor) {
      ctx.fillStyle = scrollbarTrackColor;
      fillRect(ctx, hsbOuterRect)
    }

    ctx.fillStyle = scrollbarThumbColor;
    fillRect(ctx, hsbThumbRect);
  }

  if (overflowY) {
    if (scrollbarTrackColor) {
      ctx.fillStyle = scrollbarTrackColor;
      fillRect(ctx, vsbOuterRect)
    }
    
    ctx.fillStyle = scrollbarThumbColor;
    fillRect(ctx, vsbThumbRect);
  }

  // Draw outer border
  lineRenderer.hline(ctx, 0, 0, canvas.width);
  lineRenderer.vline(ctx, 0, 0, canvas.height);
  lineRenderer.hline(ctx, 0, canvas.height - BORDER_WIDTH, canvas.width);
  lineRenderer.vline(ctx, canvas.width - BORDER_WIDTH, 0, canvas.height);

  const { rowHeight } = theme;

  // Draw header bottom border
  lineRenderer.hline(ctx, 0, rowHeight, canvas.width);

  const gridWidth  = Math.min(mainRect.width,  contentSize.width);
  const gridHeight = Math.min(mainRect.height, contentSize.height + rowHeight);

  // If horizontal scrollbar is visible, draw its border, otherwise,
  // draw table content right border
  if (overflowX) {
    lineRenderer.hline(ctx, 0, hsbOuterRect.y, canvas.width);
  } else {
    lineRenderer.vline(ctx, gridWidth, 0, gridHeight);
  }

  // If vertical scrollbar is visible, draw its border, otherwise,
  // draw table content bottom border
  if (overflowY) {
    lineRenderer.vline(ctx, vsbOuterRect.x, 0, canvas.height);
  } else {
    lineRenderer.hline(ctx, 0, gridHeight, gridWidth);
  }

  // Draw grid horizontal lines
  for (let i = 1; i < rowPositions.length; i++) {
    const y = rowPositions[i];
    lineRenderer.hline(ctx, 0, y, gridWidth);
  }

  // Draw grid vertical lines
  for (let i = 1; i < columnPositions.length; i++) {
    const x = columnPositions[i];
    lineRenderer.vline(ctx, x, 0, gridHeight);
  }

  const { columnLeft, rowTop } = tableRanges;

  const { cellPadding } = theme;

  const halfOfRowHeight = rowHeight / 2;
  const doubleOfCellPadding = cellPadding * 2;

  // Calculate text data
  const bodyTextData = [];
  const headerTextData = [];
  for (const [j, xPos] of columnPositions.entries()) {
    const columnIndex = j + columnLeft;
    const columnState = columnStates[columnIndex];

    const x = xPos + cellPadding;
    const y = halfOfRowHeight;
    const maxWidth = columnState.width - doubleOfCellPadding;
    const text = columnState.title;

    headerTextData.push({ x, y, maxWidth, text })

    for (const [i, yPos] of rowPositions.entries()) {
      const rowIndex = i + rowTop;
      const dataRow = dataRows[rowIndex];

      const y = yPos + halfOfRowHeight;
      const text = dataRow[columnState.field];

      bodyTextData.push({ x, y, maxWidth, text });
    }
  }

  ctx.save();

  clipRect(ctx, mainRect);

  // Draw header font
  for (const { x, y, maxWidth, text } of headerTextData) {
    textRenderer.render(ctx, headerFont, text, x, y, maxWidth, true);
  }

  clipRect(ctx, bodyRect);

  // Draw body text
  for (const { x, y, maxWidth, text } of bodyTextData) {
    textRenderer.render(ctx, bodyFont, text, x, y, maxWidth, true);
  }

  ctx.restore();

  const indexOfColumnToHighlight = indexOfColumnWhoseResizerIsBeingHovered !== -1
    ? indexOfColumnWhoseResizerIsBeingHovered
    : indexOfColumnBeingResized;

  if (indexOfColumnToHighlight !== -1) {
    const columnState = columnStates[indexOfColumnToHighlight];
    const { width: columnWidth } = columnState;

    const columnPositionIndex = indexOfColumnToHighlight - columnLeft;
    const columnPosition = columnPositions[columnPositionIndex];

    const x = columnPosition + columnWidth - COLUMN_RESIZER_WIDTH;
    const width = (COLUMN_RESIZER_WIDTH * 2) + 1;

    ctx.fillStyle = "blue";
    ctx.fillRect(x, 0, width, rowHeight);
  }
}

function reflow(ct: CanvasTable) {
  const {
    canvas,
    contentSize,
    mainRect,
    bodyRect,
    headerRect,
    scrollPos,
    theme
  } = ct;

  const {
    rowHeight,
    scrollbarThickness,
    scrollbarTrackMargin
  } = theme;

  const outerMainRectWidth  = canvas.width  - BORDER_WIDTH;
  const outerMainRectHeight = canvas.height - BORDER_WIDTH;
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

  ct.overflowX = overflowX;
  ct.overflowY = overflowY;

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

  const viewportSize = { width: bodyRect.width, height: bodyRect.height };
  ct.viewportSize = viewportSize;

  const scrollWidth  = Math.max(contentSize.width,  viewportSize.width);
  const scrollHeight = Math.max(contentSize.height, viewportSize.height);
  const scrollSize = { width: scrollWidth, height: scrollHeight };
  ct.scrollSize = scrollSize;

  const normalizedViewportWidth  = viewportSize.width  / scrollWidth;
  const normalizedViewportHeight = viewportSize.height / scrollHeight;
  const normalizedViewportSize = {
    width:  normalizedViewportWidth,
    height: normalizedViewportHeight
  };
  ct.normalizedViewportSize = normalizedViewportSize;

  const maxScrollLeft = scrollWidth  - viewportSize.width;
  const maxScrollTop  = scrollHeight - viewportSize.height;
  const maxScrollPos = { x: maxScrollLeft, y: maxScrollTop };
  ct.maxScrollPos = maxScrollPos;

  const scrollLeft = Math.min(scrollPos.x, maxScrollLeft);
  const scrollTop  = Math.min(scrollPos.y, maxScrollTop);
  ct.scrollPos = { x: scrollLeft, y: scrollTop };

  const normalizedScrollX = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
  const normalizedScrollY = maxScrollTop  > 0 ? scrollTop  / maxScrollTop  : 0;
  const normalizedScrollPos = {
    x: normalizedScrollX,
    y: normalizedScrollY
  };
  ct.normalizedScrollPos = normalizedScrollPos;

  const outerThickness = scrollbarThickness + BORDER_WIDTH ;

  const hsbOuterRect = createRect({
    y: mainRect.height,
    width: mainRect.width,
    height: outerThickness
  });
  ct.hsbOuterRect = hsbOuterRect;

  const hsbInnerRect = createRect({
    x: BORDER_WIDTH,
    y: hsbOuterRect.y + BORDER_WIDTH,
    width: hsbOuterRect.width - BORDER_WIDTH,
    height: scrollbarThickness
  });
  ct.hsbInnerRect = hsbInnerRect;

  const hsbTrackX = hsbInnerRect.x + scrollbarTrackMargin;
  const hsbTrackY = hsbInnerRect.y + scrollbarTrackMargin;
  const hsbTrackWidth =  hsbInnerRect.width  - (scrollbarTrackMargin * 2);
  const hsbTrackHeight = hsbInnerRect.height - (scrollbarTrackMargin * 2);
  const hsbTrackRect = createRect({
    x: hsbTrackX,
    y: hsbTrackY,
    width: hsbTrackWidth,
    height: hsbTrackHeight
  });
  ct.hsbTrackRect = hsbTrackRect;

  const { width: normViewportWidth } = normalizedViewportSize;

  const hsbThumbWidth = Math.max(normViewportWidth * hsbTrackWidth, MIN_THUMB_LENGTH);

  const hsbMaxThumbPos = hsbTrackX + hsbTrackWidth - hsbThumbWidth;
  ct.hsbMaxThumbPos = hsbMaxThumbPos;

  ct.hsbThumbRect.x = scale(scrollLeft, 0, maxScrollLeft, hsbTrackX, hsbMaxThumbPos);
  ct.hsbThumbRect.y = hsbTrackY;
  ct.hsbThumbRect.width = hsbThumbWidth;
  ct.hsbThumbRect.height = hsbTrackHeight;

  ct.hsbMaxThumbPos = hsbMaxThumbPos;

  const vsbOuterRect = createRect({
    x: mainRect.width,
    y: rowHeight,
    width: outerThickness,
    height: bodyRect.height
  });
  ct.vsbOuterRect = vsbOuterRect;

  const vsbInnerRect = createRect({
    x: vsbOuterRect.x + BORDER_WIDTH,
    y: rowHeight + BORDER_WIDTH,
    width: scrollbarThickness,
    height: vsbOuterRect.height - BORDER_WIDTH
  });
  ct.vsbInnerRect = vsbInnerRect;

  const vsbTrackX = vsbInnerRect.x + scrollbarTrackMargin;
  const vsbTrackY = vsbInnerRect.y + scrollbarTrackMargin;
  const vsbTrackWidth =  vsbInnerRect.width  - (scrollbarTrackMargin * 2);
  const vsbTrackHeight = vsbInnerRect.height - (scrollbarTrackMargin * 2);
  const vsbTrackRect = createRect({
    x: vsbTrackX,
    y: vsbTrackY,
    width: vsbTrackWidth,
    height: vsbTrackHeight
  });
  ct.vsbTrackRect = vsbTrackRect;

  const { height: normViewportHeight } = normalizedViewportSize;

  const vsbThumbHeight = Math.max(normViewportHeight * vsbTrackHeight, MIN_THUMB_LENGTH);

  const vsbMaxThumbPos = vsbTrackY + vsbTrackHeight - vsbThumbHeight;
  ct.vsbMaxThumbPos = vsbMaxThumbPos;

  ct.vsbThumbRect.x = vsbTrackX;
  ct.vsbThumbRect.y = scale(scrollTop, 0, maxScrollTop, vsbTrackY, vsbMaxThumbPos);
  ct.vsbThumbRect.width = vsbTrackWidth;
  ct.vsbThumbRect.height = vsbThumbHeight;
}

function updateContentSize(ct: CanvasTable) {
  const { columnStates, dataRows, theme } = ct;
  const { rowHeight } = theme;

  const numberOfRows = dataRows.length;

  let contentWidth = 0;
  for (const columnState of columnStates) {
    const { width } = columnState;
    contentWidth += width;
  }

  const contentHeight = numberOfRows * rowHeight;
  const contentSize = createSize(contentWidth, contentHeight);

  ct.contentSize = contentSize;
}

function updateScreenData(ct: CanvasTable) {
  const {
    columnStates,
    dataRows,
    theme,
    scrollPos,
    viewportSize
  } = ct;

  const { rowHeight } = theme;

  const {
    x: scrollLeft,
    y: scrollTop
  } = scrollPos;

  const {
    width:  viewportWidth,
    height: viewportHeight
  } = viewportSize;

  let columnLeft = 0;
  let columnPos = 0;

  for (; columnLeft < columnStates.length - 1; columnLeft++) {
    const currColumnState = columnStates[columnLeft];
    const nextColumnState = columnStates[columnLeft + 1];
    const { width: nextColumnWidth } = nextColumnState;

    if (columnPos + nextColumnWidth > scrollLeft) {
      break;
    }

    const { width: currColumnWidth } = currColumnState;
    columnPos += currColumnWidth;
  }

  const columnPositions = [];
  const scrollRight = scrollLeft + viewportWidth;

  let columnRight = columnLeft;
  for (; columnRight < columnStates.length; columnRight++) {
    if (columnPos >= scrollRight) {
      break;
    }

    columnPositions.push(columnPos - scrollLeft);

    const columnState = columnStates[columnRight];
    const { width: columnWidth } = columnState;
    columnPos += columnWidth;
  }

  const rowTop = Math.floor(scrollTop / rowHeight);

  const scrollBottom = scrollTop + viewportHeight;
  const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), dataRows.length);

  const rowPositions = [];
  const yOffset = -scrollTop + rowHeight;
  for (let i = rowTop; i < rowBottom; i++) {
    rowPositions.push(i * rowHeight + yOffset);
  }

  ct.tableRanges.columnLeft  = columnLeft;
  ct.tableRanges.columnRight = columnRight;
  ct.columnPositions = columnPositions;

  ct.tableRanges.rowTop    = rowTop;
  ct.tableRanges.rowBottom = rowBottom;
  ct.rowPositions = rowPositions;
}

function updateFonts(ct: CanvasTable) {
  const { theme } = ct;

  const baseFont = {
    family: theme.fontFamily,
    size: theme.fontSize
  };

  const bodyFont = { ...baseFont,
    color: theme.bodyFontColor ?? theme.fontColor,
    style: theme.bodyFontStyle ?? theme.fontStyle
  };
  ct.bodyFont = bodyFont;

  const headerFont = {
    ...baseFont,
    color: theme.headerFontColor ?? theme.fontColor,
    style: theme.headerFontStyle ?? theme.fontStyle
  };
  ct.headerFont = headerFont;
}

function findIndexOfColumnWhoseResizerIsBeingHovered(ct: CanvasTable, mousePos: VectorLike) {
  const { theme } = ct;
  const { rowHeight } = theme;

  const { x: mouseX, y: mouseY } = mousePos;
  if (mouseY < 0 || mouseY >= rowHeight) {
    return -1;
  }

  const { columnStates, columnPositions, tableRanges } = ct;
  const { columnLeft } = tableRanges;

  for (const [j, pos] of columnPositions.entries()) {
    const columnIndex = j + columnLeft;
    const columnState = columnStates[columnIndex];
    const centerX = pos + columnState.width;
    const x1 = centerX - COLUMN_RESIZER_WIDTH;
    const x2 = centerX + COLUMN_RESIZER_WIDTH + 1;

    if (mouseX >= x1 && mouseX <= x2) {
      return columnIndex;
    }
  }

  return -1;
}

function getRelativeMousePos(wrapperEl: HTMLDivElement, eventPos: VectorLike): VectorLike {
  const bcr = wrapperEl.getBoundingClientRect();
  const x = eventPos.x - bcr.x;
  const y = eventPos.y - bcr.y;
  return { x, y };
}

function columnDefsToColumnStates(columnDefs: ColumnDef[]) {
  const columnStates = [] as ColumnState[];
  let total = 0;
  for (const { width, ...rest } of columnDefs) {
    const _width = width ?? DEFAULT_COLUMN_WIDTH;
    columnStates.push({...rest, width: _width });
    total += _width;
  }
  return columnStates;
}

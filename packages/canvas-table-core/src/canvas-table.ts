import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";
import { defaultTheme } from "./defaultTheme";
import {
  shallowMerge,
  scale,
  clamp,
  clipRect,
  pointInRect,
  withContext
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
  TextData,
} from "./types";

export function create(params: CanvasTableParams): CanvasTable {
  const { container, columnDefs, dataRows, size } = params;

  const columnStates = columnDefsToColumnStates(columnDefs);

  const theme = { ...defaultTheme, ...params.theme };

  const containerEl = document.getElementById(container);
  if (!containerEl) {
    throw new Error(`Element with id "${params.container}" could not be found`);
  }

  containerEl.replaceChildren();
  containerEl.style.overflow = "hidden";

  const wrapperEl = document.createElement("div");
  wrapperEl.classList.add("canvas-table-wrapper");
  containerEl.appendChild(wrapperEl);

  const canvasWidth  = size?.width  ?? 1;
  const canvasHeight = size?.height ?? 1;

  const canvas = document.createElement("canvas");
  canvas.width  = canvasWidth;
  canvas.height = canvasHeight;
  wrapperEl.appendChild(canvas);

  const lineRenderer = new LineRenderer();
  const textRenderer = new TextRenderer();

  const { rowHeight } = theme;

  const mainRectX = 0;
  const mainRectY = 0;
  const mainRectWidth = 1;
  const mainRectHeight = 1;

  const bodyRectX = 0;
  const bodyRectY = rowHeight;
  const bodyRectWidth = 1;
  const bodyRectHeight = 1;

  const headerRectX = 0;
  const headerRectY = 0;
  const headerRectWidth = 1;
  const headerRectHeight = rowHeight;

  const scrollX = 0;
  const scrollY = 0;

  const maxScrollX = 0;
  const maxScrollY = 0;

  const normScrollX = 0;
  const normScrollY = 0;

  const scrollWidth  = 1;
  const scrollHeight = 1;

  const viewportWidth  = 1;
  const viewportHeight = 1;

  const normViewportWidth  = 1;
  const normViewportHeight = 1;

  const overflowX = false;
  const overflowY = false;

  const hsbOuterX = 0;
  const hsbOuterY = 0;
  const hsbOuterWidth = 1;
  const hsbOuterHeight = 1;

  const hsbInnerX = 0;
  const hsbInnerY = 0;
  const hsbInnerWidth = 1;
  const hsbInnerHeight = 1;

  const hsbTrackX      = 0;
  const hsbTrackY      = 0;
  const hsbTrackWidth  = 1;
  const hsbTrackHeight = 1;

  const hsbThumbX      = 0;
  const hsbThumbY      = 0;
  const hsbThumbWidth  = 1;
  const hsbThumbHeight = 1;

  const hsbMaxThumbPos = 0;
  const hsbDragOffset  = 0;
  const hsbIsDragging = false;

  const vsbOuterX      = 0;
  const vsbOuterY      = 0;
  const vsbOuterWidth  = 1;
  const vsbOuterHeight = 1;

  const vsbInnerX      = 0;
  const vsbInnerY      = 0;
  const vsbInnerWidth  = 1;
  const vsbInnerHeight = 1;

  const vsbTrackX      = 0;
  const vsbTrackY      = 0;
  const vsbTrackWidth  = 1;
  const vsbTrackHeight = 1;

  const vsbThumbX      = 0;
  const vsbThumbY      = 0;
  const vsbThumbWidth  = 1;
  const vsbThumbHeight = 1;

  const vsbMaxThumbPos = 0;
  const vsbDragOffset = 0;
  const vsbIsDragging = false;

  const indexOfColumnWhoseResizerIsBeingHovered = -1;
  const indexOfColumnBeingResized = -1;

  const columnLeft = 0;
  const columnRight = 0;
  const rowTop = 0;
  const rowBottom = 0;

  const ct = {
    canvas,
    containerEl,
    wrapperEl,
    lineRenderer,
    textRenderer,
    columnStates,
    dataRows,
    theme,
    mainRectX,
    mainRectY,
    mainRectWidth,
    mainRectHeight,
    bodyRectX,
    bodyRectY,
    bodyRectWidth,
    bodyRectHeight,
    headerRectX,
    headerRectY,
    headerRectWidth,
    headerRectHeight,
    hsbOuterX,
    hsbOuterY,
    hsbOuterWidth,
    hsbOuterHeight,
    hsbInnerX,
    hsbInnerY,
    hsbInnerWidth,
    hsbInnerHeight,
    hsbTrackX,
    hsbTrackY,
    hsbTrackWidth,
    hsbTrackHeight,
    hsbThumbX,
    hsbThumbY,
    hsbThumbWidth,
    hsbThumbHeight,
    hsbMaxThumbPos,
    hsbDragOffset,
    hsbIsDragging,
    vsbOuterX,
    vsbOuterY,
    vsbOuterWidth,
    vsbOuterHeight,
    vsbInnerX,
    vsbInnerY,
    vsbInnerWidth,
    vsbInnerHeight,
    vsbTrackX,
    vsbTrackY,
    vsbTrackWidth,
    vsbTrackHeight,
    vsbThumbX,
    vsbThumbY,
    vsbThumbWidth,
    vsbThumbHeight,
    vsbMaxThumbPos,
    vsbDragOffset,
    vsbIsDragging,
    indexOfColumnWhoseResizerIsBeingHovered,
    indexOfColumnBeingResized,
    scrollX,
    scrollY,
    maxScrollX,
    maxScrollY,
    normScrollX,
    normScrollY,
    scrollWidth,
    scrollHeight,
    viewportWidth,
    viewportHeight,
    normViewportWidth,
    normViewportHeight,
    columnLeft,
    columnRight,
    rowTop,
    rowBottom,
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
  const {
    wrapperEl,
    hsbThumbX,
    hsbThumbY,
    hsbThumbWidth,
    hsbThumbHeight,
    vsbThumbX,
    vsbThumbY,
    vsbThumbWidth,
    vsbThumbHeight,
    indexOfColumnWhoseResizerIsBeingHovered
  } = ct;

  const eventPos = { x: event.clientX, y: event.clientY };

  const mousePos = getRelativeMousePos(wrapperEl, eventPos);
  const { x: mouseX, y: mouseY } = mousePos;

  const hsbIsDragging = pointInRect(
    mouseX, mouseY, hsbThumbX, hsbThumbY, hsbThumbWidth, hsbThumbHeight);
  if (hsbIsDragging) {
    ct.hsbDragOffset = mouseX - hsbThumbX;
  }
  ct.hsbIsDragging = hsbIsDragging;

  const vsbIsDragging = pointInRect(
    mouseX, mouseY, vsbThumbX, vsbThumbY, vsbThumbWidth, vsbThumbHeight);
  if (vsbIsDragging) {
    ct.vsbDragOffset = mouseY - vsbThumbY;
  }
  ct.vsbIsDragging = vsbIsDragging;

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
  const {
    wrapperEl,
    columnStates,
    columnPositions,
    theme,
    columnLeft,
    hsbTrackX,
    vsbTrackY,
    vsbMaxThumbPos,
    vsbDragOffset,
    vsbIsDragging,
    maxScrollX,
    maxScrollY,
    hsbMaxThumbPos,
    hsbDragOffset,
    hsbIsDragging,
    indexOfColumnWhoseResizerIsBeingHovered
  } = ct;

  const { rowHeight } = theme;

  const eventPos = { x: event.clientX, y: event.clientY }

  const mousePos = getRelativeMousePos(wrapperEl, eventPos);
  const { x: mouseX, y: mouseY } = mousePos;

  let shouldUpdate = false;

  if (hsbIsDragging) {
    const hsbThumbX = clamp(mouseX - hsbDragOffset, hsbTrackX, hsbMaxThumbPos);
    ct.hsbThumbX = hsbThumbX;

    const normScrollX = scale(hsbThumbX, hsbTrackX, hsbMaxThumbPos, 0, 1);
    ct.normScrollX = normScrollX;

    const scrollX = Math.round(scale(normScrollX, 0, 1, 0, maxScrollX));
    ct.scrollX = scrollX;

    shouldUpdate = true;
  }

  if (vsbIsDragging) {
    const vsbThumbY = clamp(mouseY - vsbDragOffset, vsbTrackY, vsbMaxThumbPos);
    ct.vsbThumbY = vsbThumbY;

    const normScrollY = scale(vsbThumbY, vsbTrackY, vsbMaxThumbPos, 0, 1);
    ct.normScrollY = normScrollY;

    const scrollY = Math.round(scale(normScrollY, 0, 1, 0, maxScrollY));
    ct.scrollY = scrollY;

    shouldUpdate = true;
  }

  {
    const oldIndex = indexOfColumnWhoseResizerIsBeingHovered;
    let newIndex = -1;

    const { x: mouseX, y: mouseY } = mousePos;
    if (mouseY >= 0 && mouseY < rowHeight) {
      for (const [j, pos] of columnPositions.entries()) {
        const columnIndex = j + columnLeft;
        const columnState = columnStates[columnIndex];
        const centerX = pos + columnState.width;
        const x1 = centerX - COLUMN_RESIZER_WIDTH;
        const x2 = centerX + COLUMN_RESIZER_WIDTH + 1;

        if (mouseX >= x1 && mouseX < x2) {
          newIndex = columnIndex;
          break;
        }
      }
    }

    if (newIndex !== oldIndex) {
      ct.indexOfColumnWhoseResizerIsBeingHovered = newIndex;
      shouldUpdate = true;
    }
  }

  // const { columnStates, columnPositions, indexOfColumnBeingResized } = ct;

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
    mainRectWidth,
    mainRectHeight,
    bodyRectX,
    bodyRectY,
    bodyRectWidth,
    bodyRectHeight,
    headerRectX,
    headerRectY,
    headerRectWidth,
    headerRectHeight,
    hsbOuterX,
    hsbOuterY,
    hsbOuterWidth,
    hsbOuterHeight,
    hsbThumbX,
    hsbThumbY,
    hsbThumbWidth,
    hsbThumbHeight,
    vsbOuterX,
    vsbOuterY,
    vsbOuterWidth,
    vsbOuterHeight,
    vsbThumbX,
    vsbThumbY,
    vsbThumbWidth,
    vsbThumbHeight,
    columnStates,
    dataRows,
    columnLeft,
    rowTop,
    columnPositions,
    rowPositions,
    contentWidth,
    contentHeight,
    overflowX,
    overflowY,
    indexOfColumnWhoseResizerIsBeingHovered,
    indexOfColumnBeingResized,
  } = ct;

  const {
    rowHeight,
    cellPadding,
    tableBackgroundColor,
    bodyBackgroundColor = tableBackgroundColor,
    headerBackgroundColor = tableBackgroundColor,
    scrollbarTrackColor,
    scrollbarThumbColor,
  } = theme;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate context");
  }

  // Draw or clear table background
  if (tableBackgroundColor) {
    ctx.fillStyle = tableBackgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Draw body background
  if (bodyBackgroundColor) {
    ctx.fillStyle = bodyBackgroundColor;
    ctx.fillRect(bodyRectX, bodyRectY, bodyRectWidth, bodyRectHeight);
  }

  // Draw header background
  if (headerBackgroundColor) {
    ctx.fillStyle = headerBackgroundColor;
    ctx.fillRect(headerRectX, headerRectY, headerRectWidth, headerRectHeight);
  }

  // Draw scrollbar background and thumb
  if (overflowX) {
    if (scrollbarTrackColor) {
      ctx.fillStyle = scrollbarTrackColor;
      ctx.fillRect(hsbOuterX, hsbOuterY, hsbOuterWidth, hsbOuterHeight);
    }

    ctx.fillStyle = scrollbarThumbColor;
    ctx.fillRect(hsbThumbX, hsbThumbY, hsbThumbWidth, hsbThumbHeight);
  }

  if (overflowY) {
    if (scrollbarTrackColor) {
      ctx.fillStyle = scrollbarTrackColor;
      ctx.fillRect(vsbOuterX, vsbOuterY, vsbOuterWidth, vsbOuterHeight)
    }
    
    ctx.fillStyle = scrollbarThumbColor;
    ctx.fillRect(vsbThumbX, vsbThumbY, vsbThumbWidth, vsbThumbHeight);
  }

  // Draw outer border
  lineRenderer.hline(ctx, 0, 0, canvas.width);
  lineRenderer.vline(ctx, 0, 0, canvas.height);
  lineRenderer.hline(ctx, 0, canvas.height - BORDER_WIDTH, canvas.width);
  lineRenderer.vline(ctx, canvas.width - BORDER_WIDTH, 0, canvas.height);

  // Draw header bottom border
  lineRenderer.hline(ctx, 0, rowHeight, canvas.width);

  const gridWidth  = Math.min(mainRectWidth,  contentWidth);
  const gridHeight = Math.min(mainRectHeight, contentHeight + rowHeight);

  // If horizontal scrollbar is visible, draw its border, otherwise,
  // draw table content right border
  if (overflowX) {
    lineRenderer.hline(ctx, 0, hsbOuterY, canvas.width);
  } else {
    lineRenderer.vline(ctx, gridWidth, 0, gridHeight);
  }

  // If vertical scrollbar is visible, draw its border, otherwise,
  // draw table content bottom border
  if (overflowY) {
    lineRenderer.vline(ctx, vsbOuterX, 0, canvas.height);
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

  const halfOfRowHeight = rowHeight / 2;
  const doubleOfCellPadding = cellPadding * 2;

  // Calculate text data
  const bodyTextData   = [] as TextData[];
  const headerTextData = [] as TextData[];
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

  // Draw header font
  withContext(ctx, () => {
    clipRect(ctx, headerRectX, headerRectY, headerRectWidth, headerRectHeight);

    for (const { x, y, maxWidth, text } of headerTextData) {
      textRenderer.render(ctx, headerFont, text, x, y, maxWidth, true);
    }
  })

  // Draw body text
  withContext(ctx, () => {
    clipRect(ctx, bodyRectX, bodyRectY, bodyRectWidth, bodyRectHeight);

    for (const { x, y, maxWidth, text } of bodyTextData) {
      textRenderer.render(ctx, bodyFont, text, x, y, maxWidth, true);
    }
  });

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
  const { canvas, contentWidth, contentHeight, theme } = ct;
  const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = theme;

  const outerMainRectWidth  = canvas.width  - BORDER_WIDTH;
  const outerMainRectHeight = canvas.height - BORDER_WIDTH;
  const innerMainRectWidth  = outerMainRectWidth  - scrollbarThickness - BORDER_WIDTH;
  const innerMainRectHeight = outerMainRectHeight - scrollbarThickness - BORDER_WIDTH;

  const outerBodyRectHeight = outerMainRectHeight - rowHeight;
  const innerBodyRectHeight = innerMainRectHeight - rowHeight;

  let overflowX: boolean;
  let overflowY: boolean;
  if (outerMainRectWidth >= contentWidth && outerBodyRectHeight >= contentHeight) {
    overflowX = overflowY = false;
  } else {
    overflowX = innerMainRectWidth  < contentWidth;
    overflowY = innerBodyRectHeight < contentHeight;
  }

  let mainRectWidth:   number;
  let bodyRectWidth:   number;
  let headerRectWidth: number;

  if (overflowY) {
    mainRectWidth   = innerMainRectWidth;
    bodyRectWidth   = innerMainRectWidth;
    headerRectWidth = innerMainRectWidth;
  } else {
    mainRectWidth   = outerMainRectWidth;
    bodyRectWidth   = outerMainRectWidth;
    headerRectWidth = outerMainRectWidth;
  }

  let mainRectHeight: number;
  let bodyRectHeight: number;

  if (overflowX) {
    mainRectHeight = innerMainRectHeight;
    bodyRectHeight = innerBodyRectHeight;
  } else {
    mainRectHeight = outerMainRectHeight;
    bodyRectHeight = outerBodyRectHeight;
  }

  const viewportWidth = bodyRectWidth;
  const viewportHeight = bodyRectHeight;

  const scrollWidth = Math.max(contentWidth,  viewportWidth);
  const scrollHeight = Math.max(contentHeight, viewportHeight);

  const normViewportWidth = viewportWidth  / scrollWidth;
  const normViewportHeight = viewportHeight / scrollHeight;

  const maxScrollX = scrollWidth  - viewportWidth;
  const maxScrollY  = scrollHeight - viewportHeight;

  const scrollX = Math.min(ct.scrollX, maxScrollX);
  const scrollY = Math.min(ct.scrollY, maxScrollY);

  const normScrollX = maxScrollX > 0 ? scrollX / maxScrollX : 0;
  const normScrollY = maxScrollY > 0 ? scrollY  / maxScrollY  : 0;

  const outerThickness = scrollbarThickness + BORDER_WIDTH ;

  const hsbOuterY = mainRectHeight;
  const hsbOuterWidth = mainRectWidth;
  const hsbOuterHeight = outerThickness;

  const hsbInnerX = BORDER_WIDTH;
  const hsbInnerY = hsbOuterY + BORDER_WIDTH;
  const hsbInnerWidth = hsbOuterWidth - BORDER_WIDTH;
  const hsbInnerHeight = scrollbarThickness;

  const hsbTrackX = hsbInnerX + scrollbarTrackMargin;
  const hsbTrackY = hsbInnerY + scrollbarTrackMargin;
  const hsbTrackWidth = hsbInnerWidth - (scrollbarTrackMargin * 2);
  const hsbTrackHeight = hsbInnerHeight - (scrollbarTrackMargin * 2);

  const hsbThumbWidth = Math.max(normViewportWidth * hsbTrackWidth, MIN_THUMB_LENGTH);
  const hsbThumbHeight = hsbTrackHeight;
  const hsbMaxThumbPos = hsbTrackX + hsbTrackWidth - hsbThumbWidth;
  const hsbThumbX = scale(scrollX, 0, maxScrollX, hsbTrackX, hsbMaxThumbPos);
  const hsbThumbY = hsbTrackY;

  const vsbOuterX = mainRectWidth;
  const vsbOuterY = rowHeight;

  const vsbOuterWidth = outerThickness;
  const vsbOuterHeight = bodyRectHeight;

  const vsbInnerX = vsbOuterX + BORDER_WIDTH;
  const vsbInnerY = rowHeight + BORDER_WIDTH;
  const vsbInnerWidth = scrollbarThickness;
  const vsbInnerHeight = vsbOuterHeight - BORDER_WIDTH;

  const vsbTrackX = vsbInnerX + scrollbarTrackMargin;
  const vsbTrackY = vsbInnerY + scrollbarTrackMargin;
  const vsbTrackWidth =  vsbInnerWidth  - (scrollbarTrackMargin * 2);
  const vsbTrackHeight = vsbInnerHeight - (scrollbarTrackMargin * 2);
  const vsbThumbWidth = vsbTrackWidth;

  const vsbThumbHeight = Math.max(normViewportHeight * vsbTrackHeight, MIN_THUMB_LENGTH);
  const vsbMaxThumbPos = vsbTrackY + vsbTrackHeight - vsbThumbHeight;
  const vsbThumbX = vsbTrackX;
  const vsbThumbY = scale(scrollY, 0, maxScrollY, vsbTrackY, vsbMaxThumbPos);
  
  ct.mainRectWidth   = mainRectWidth;
  ct.mainRectHeight = mainRectHeight;
  ct.bodyRectWidth   = bodyRectWidth;
  ct.bodyRectHeight = bodyRectHeight;
  ct.headerRectWidth = headerRectWidth;
  ct.scrollX = scrollX;
  ct.scrollY = scrollY;
  ct.maxScrollX = maxScrollX;
  ct.maxScrollY = maxScrollY;
  ct.normScrollX = normScrollX;
  ct.normScrollY = normScrollY;
  ct.scrollWidth = scrollWidth;
  ct.scrollHeight = scrollHeight;
  ct.viewportWidth = viewportWidth;
  ct.viewportHeight = viewportHeight;
  ct.normViewportWidth = normViewportWidth;
  ct.normViewportHeight = normViewportHeight;
  ct.overflowX = overflowX;
  ct.overflowY = overflowY;
  ct.hsbOuterY = hsbOuterY;
  ct.hsbOuterWidth = hsbOuterWidth;
  ct.hsbOuterHeight = hsbOuterHeight;
  ct.hsbInnerX = hsbInnerX;
  ct.hsbInnerY = hsbInnerY;
  ct.hsbInnerWidth = hsbInnerWidth;
  ct.hsbInnerHeight = hsbInnerHeight;
  ct.hsbTrackX = hsbTrackX;
  ct.hsbTrackY = hsbTrackY;
  ct.hsbTrackWidth = hsbTrackWidth;
  ct.hsbTrackHeight = hsbTrackHeight;
  ct.hsbThumbWidth = hsbThumbWidth;
  ct.hsbThumbHeight = hsbThumbHeight;
  ct.hsbMaxThumbPos = hsbMaxThumbPos;
  ct.hsbThumbX = hsbThumbX;
  ct.hsbThumbY = hsbThumbY;
  ct.vsbOuterX = vsbOuterX;
  ct.vsbOuterY = vsbOuterY;
  ct.vsbOuterWidth = vsbOuterWidth;
  ct.vsbOuterHeight = vsbOuterHeight;
  ct.vsbInnerX = vsbInnerX;
  ct.vsbInnerY = vsbInnerY;
  ct.vsbInnerWidth = vsbInnerWidth;
  ct.vsbInnerHeight = vsbInnerHeight;
  ct.vsbTrackX = vsbTrackX;
  ct.vsbTrackY = vsbTrackY;
  ct.vsbTrackWidth = vsbTrackWidth;
  ct.vsbTrackHeight = vsbTrackHeight;
  ct.vsbThumbWidth = vsbThumbWidth;
  ct.vsbThumbHeight = vsbThumbHeight;
  ct.vsbMaxThumbPos = vsbMaxThumbPos;
  ct.vsbThumbX = vsbThumbX;
  ct.vsbThumbY = vsbThumbY;
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
  ct.contentWidth = contentWidth;

  const contentHeight = numberOfRows * rowHeight;
  ct.contentHeight = contentHeight;

}

function updateScreenData(ct: CanvasTable) {
  const {
    columnStates,
    dataRows,
    theme,
    scrollX,
    scrollY,
    viewportWidth,
    viewportHeight
  } = ct;

  const { rowHeight } = theme;

  let columnLeft = 0;
  let columnPos = 0;

  for (; columnLeft < columnStates.length - 1; columnLeft++) {
    const currColumnState = columnStates[columnLeft];
    const nextColumnState = columnStates[columnLeft + 1];
    const { width: nextColumnWidth } = nextColumnState;

    if (columnPos + nextColumnWidth > scrollX) {
      break;
    }

    const { width: currColumnWidth } = currColumnState;
    columnPos += currColumnWidth;
  }

  const columnPositions = [];
  const scrollRight = scrollX + viewportWidth;

  let columnRight = columnLeft;
  for (; columnRight < columnStates.length; columnRight++) {
    if (columnPos >= scrollRight) {
      break;
    }

    columnPositions.push(columnPos - scrollX);

    const columnState = columnStates[columnRight];
    const { width: columnWidth } = columnState;
    columnPos += columnWidth;
  }

  const rowTop = Math.floor(scrollY / rowHeight);

  const scrollBottom = scrollY + viewportHeight;
  const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), dataRows.length);

  const rowPositions = [];
  for (let i = rowTop; i < rowBottom; i++) {
    rowPositions.push(i * rowHeight + rowHeight - scrollY);
  }

  ct.columnPositions = columnPositions;
  ct.columnLeft  = columnLeft;
  ct.columnRight = columnRight;
  ct.rowPositions = rowPositions;
  ct.rowTop    = rowTop;
  ct.rowBottom = rowBottom;
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

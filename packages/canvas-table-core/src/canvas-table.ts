import {
  tableStateCreate,
  tableStateSetContent,
  tableStateSetTheme,
  tableStateSetSize
} from "./table-state";
import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";
import { defaultTheme } from "./defaultTheme";
import { shallowMerge, createRect, createVector, createSize } from "./utils";
import { DEFAULT_COLUMN_WIDTH, BORDER_WIDTH } from "./constants";
import {
  CanvasTable,
  CanvasTableParams,
  ColumnDef,
  ColumnState,
  DataRow,
  RectLike,
  Size,
  Theme,
} from "./types";

export function canvasTableCreate(params: CanvasTableParams): CanvasTable {
  const { container, columnDefs, dataRows, size } = params;

  const columnStates = columnDefsToColumnStates(columnDefs);

  const theme = { ...defaultTheme, ...params.theme };

  const canvasSize = createSize(size);

  const tableState = tableStateCreate(columnStates, dataRows, theme, canvasSize);

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

  const ct = {
    canvas,
    containerEl,
    wrapperEl,
    tableState,
    lineRenderer,
    textRenderer,
    mousePos,
  } as CanvasTable;

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

export function canvasTableSetContent(
  ct: CanvasTable,
  columnDefs: ColumnDef[],
  dataRows: DataRow[]
) {
  const { tableState } = ct;

  const columnStates = columnDefsToColumnStates(columnDefs);

  tableStateSetContent(tableState, columnStates, dataRows);
  render(ct);
}

export function canvasTableSetSize(ct: CanvasTable, size: Size) {
  if (size.width <= 0 || size.height <= 0) {
    return;
  }

  const { canvas, tableState } = ct;

  canvas.width  = size.width;
  canvas.height = size.height;

  tableStateSetSize(tableState, size);
  render(ct);
}

export function canvasTableSetTheme(ct: CanvasTable, theme: Partial<Theme>) {
  const { tableState } = ct;

  const _theme = shallowMerge<Theme>({}, defaultTheme, theme);
  tableStateSetTheme(tableState, _theme);

  updateFonts(ct);

  const { lineRenderer } = ct;
  const { tableBorderColor } = _theme;

  lineRenderer.setColor(tableBorderColor);

  render(ct);
}

export function canvasTableCleanup(ct: CanvasTable) {
  const { mouseMoveHandler, mouseUpHandler } = ct;

  document.removeEventListener("mousemove", mouseMoveHandler);
  document.removeEventListener("mouseup", mouseUpHandler);
}

function onMouseDown(_ct: CanvasTable, _event: MouseEvent) {
}

function onMouseUp(_ct: CanvasTable, _event: MouseEvent) {
}

function onMouseMove(_ct: CanvasTable, _event: MouseEvent) {
}

function onWheel(_ct: CanvasTable, _event: WheelEvent) {
}

function render(ct: CanvasTable) {
  const { canvas } = ct;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate context");
  }

  const { tableState } = ct;
  const { canvasSize, theme } = tableState;

  // Draw or clear table background
  const { tableBackgroundColor } = theme;
  const canvasRect = createRect(canvasSize);
  if (tableBackgroundColor) {
    ctx.fillStyle = tableBackgroundColor;
    fillRect(ctx, canvasRect);
  } else {
    clearRect(ctx, canvasRect);
  }

  // Draw body background
  const { bodyRect } = tableState;
  const { bodyBackgroundColor = tableBackgroundColor } = theme;
  if (bodyBackgroundColor) {
    ctx.fillStyle = bodyBackgroundColor;
    fillRect(ctx, bodyRect);
  }

  // Draw header background
  const { headerRect } = tableState;
  const { headerBackgroundColor = tableBackgroundColor } = theme;
  if (headerBackgroundColor) {
    ctx.fillStyle = headerBackgroundColor;
    fillRect(ctx, headerRect);
  }

  const {
    hsbOuterRect,
    hsbThumbRect,
    vsbOuterRect,
    vsbThumbRect,
    overflowX,
    overflowY
  } = tableState;

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

  const { lineRenderer } = ct;

  // Draw outer border
  lineRenderer.hline(ctx, 0, 0, canvasSize.width);
  lineRenderer.vline(ctx, 0, 0, canvasSize.height);
  lineRenderer.hline(ctx, 0, canvasSize.height - BORDER_WIDTH, canvasSize.width);
  lineRenderer.vline(ctx, canvasSize.width - BORDER_WIDTH, 0, canvasSize.height);

  const { rowHeight } = theme;

  // Draw header bottom border
  lineRenderer.hline(ctx, 0, rowHeight, canvasSize.width);

  const { gridSize } = tableState;

  // If horizontal scrollbar is visible, draw its border, otherwise,
  // draw table content right border
  if (overflowX) {
    lineRenderer.hline(ctx, 0, hsbOuterRect.y, canvasSize.width);
  } else {
    lineRenderer.vline(ctx, gridSize.width, 0, gridSize.height);
  }

  // If vertical scrollbar is visible, draw its border, otherwise,
  // draw table content bottom border
  if (overflowY) {
    lineRenderer.vline(ctx, vsbOuterRect.x, 0, canvasSize.height);
  } else {
    lineRenderer.hline(ctx, 0, gridSize.height, gridSize.width);
  }

  const { columnPositions, rowPositions } = tableState;

  // Draw grid horizontal lines
  for (let i = 1; i < rowPositions.length; i++) {
    const y = rowPositions[i];
    lineRenderer.hline(ctx, 0, y, gridSize.width);
  }

  // Draw grid vertical lines
  for (let i = 1; i < columnPositions.length; i++) {
    const x = columnPositions[i];
    lineRenderer.vline(ctx, x, 0, gridSize.height);
  }

  const { textRenderer, bodyFont } = ct;

  const { columnStates, dataRows, tableRanges } = tableState;

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

  const { headerFont } = ct;

  const { mainRect } = tableState;

  clipRect(ctx, mainRect);

  // Draw header font
  for (const { x, y, maxWidth, text } of headerTextData) {
    textRenderer.render(ctx, headerFont, text, x, y, maxWidth);
  }

  clipRect(ctx, bodyRect);

  // Draw body text
  for (const { x, y, maxWidth, text } of bodyTextData) {
    textRenderer.render(ctx, bodyFont, text, x, y, maxWidth);
  }

  ctx.restore();
}

function updateFonts(ct: CanvasTable) {
  const { tableState } = ct;
  const { theme } = tableState;

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

function fillRect(ctx: CanvasRenderingContext2D, rect: RectLike) {
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function clearRect(ctx: CanvasRenderingContext2D, rect: RectLike) {
  ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
}

function clipRect(ctx: CanvasRenderingContext2D, rect: RectLike) {
  const region = new Path2D();
  region.rect(rect.x, rect.y, rect.width, rect.height);

  ctx.clip(region);
}

/*
function getRelativeMousePos(wrapperEl: HTMLDivElement, eventPos: VectorLike): VectorLike {
  const bcr = wrapperEl.getBoundingClientRect();
  const x = eventPos.x - bcr.x;
  const y = eventPos.y - bcr.y;
  return { x, y };
}
*/

function columnDefsToColumnStates(columnDefs: ColumnDef[]) {
  const columnStates = [] as ColumnState[];
  let total = 0;
  for (const { width, ...rest } of columnDefs) {
    const w = width ?? DEFAULT_COLUMN_WIDTH;
    columnStates.push({ ...rest, width: w, pos: total });
    total += w;
  }
  return columnStates;
}

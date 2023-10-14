import {
  create as createUiContext,
  getCanvasSize,
  setCanvasSize,
  removeDocumentEventListeners,
  beginFrame,
  endFrame,
  submitDraw,
  isActive,
  setAsActive,
  isHot,
  setAsHot,
  unsetAsHot,
  isMousePressed,
  getCurrentMousePosition,
  getDragAnchorPosition,
  setDragAnchorPosition,
  getDragDistance,
  MOUSE_BUTTONS,
  createUiId
} from "./ui";
import { defaultTheme } from "./default-theme";
import { shallowMerge, scale, clamp } from "./utils";
import {
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MIN_THUMB_LENGTH
} from "./constants";
import {
  CanvasTable,
  CreateCanvasTableParams,
  SetCanvasTableParams,
  ColumnDef,
  ColumnState,
  Rect,
  Vector,
  Layout,
  Viewport,
} from "./types";

export function create(params: CreateCanvasTableParams): CanvasTable {
  const { columnDefs, dataRows,  container, size } = params;

  const uiContext = createUiContext({ container: container, size: size });

  const columnStates = columnDefsToColumnStates(columnDefs);

  const theme = shallowMerge({}, defaultTheme, params.theme);

  const scrollPos = { x: 0, y: 0 };

  const ct = {
    uiContext,
    columnStates,
    dataRows,
    theme,
    scrollPos,
  } as CanvasTable;

  const rafId = requestAnimationFrame(() => update(ct));
  ct.rafId = rafId;

  return ct;
}

export function set(ct: CanvasTable, params: Partial<SetCanvasTableParams>) {
  const { uiContext } = ct;
  const { theme, size } = params;

  if (size) {
    setCanvasSize(uiContext, size);
  }

  if (theme) {
    ct.theme = shallowMerge({}, defaultTheme, theme);
  }
}

export function cleanup(ct: CanvasTable) {
  const { uiContext } = ct;
  removeDocumentEventListeners(uiContext);

  cancelAnimationFrame(ct.rafId);
}

function update(ct: CanvasTable) {
  const { uiContext, columnStates, dataRows, theme, scrollPos } = ct;

  beginFrame(uiContext);

  const canvasSize = getCanvasSize(uiContext);

  let layout = reflow(ct);

  let viewport = calculateViewport(ct, layout);

  const currentMousePosition = getCurrentMousePosition(uiContext);

  if (theme.tableBackgroundColor) {
    submitDraw(uiContext, {
      type: "rect",
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
      color: theme.tableBackgroundColor
    });
  }

  if (theme.bodyBackgroundColor) {
    submitDraw(uiContext, {
      type: "rect",
      x: 0,
      y: theme.rowHeight,
      width: layout.bodyWidth,
      height: layout.bodyHeight,
      color: theme.bodyBackgroundColor
    });
  }

  if (theme.headerBackgroundColor) {
    submitDraw(uiContext, {
      type: "rect",
      x: 0,
      y: 0,
      width: layout.tableWidth,
      height: theme.rowHeight,
      color: theme.headerBackgroundColor
    });
  }

  for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
    const columnEndPosition = getColumnEndPosition(ct, viewport, columnIndex);
    const rect = calculateColumnResizerRect(theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

    const id = { item: "column-resizer", index: columnIndex };
    if (pointInRect(currentMousePosition, rect)) {
      setAsHot(uiContext, id);

      if (isMousePressed(uiContext, MOUSE_BUTTONS.PRIMARY)) {
        setAsActive(uiContext, id);

        const dragAnchorPosition = { x: columnEndPosition, y: rect.y };
        setDragAnchorPosition(uiContext, dragAnchorPosition);
      }

      break;
    } else {
      unsetAsHot(uiContext, id);
    }
  }

  const id = { item: "column-resizer" };
  if (isActive(uiContext, id)) {
    const id = uiContext.active!;
    const columnIndex = id.index!;

    const dragAnchorPosition = getDragAnchorPosition(uiContext);
    const dragDistance = getDragDistance(uiContext);

    const columnState = columnStates[columnIndex];
    const columnPos = viewport.columnPositions.get(columnIndex)!;

    const columnWidth = Math.max(dragAnchorPosition.x + dragDistance.x - columnPos, MIN_COLUMN_WIDTH);
    columnState.width = columnWidth;

    layout = reflow(ct);

    scrollPos.x = Math.min(scrollPos.x, layout.maxScrollX);
    scrollPos.y = Math.min(scrollPos.y, layout.maxScrollY);

    viewport = calculateViewport(ct, layout);
  }

  if (isActive(uiContext, id) || isHot(uiContext, id)) {
    const id = uiContext.active ?? uiContext.hot!;
    const columnIndex = id.index!;

    const columnEndPosition = getColumnEndPosition(ct, viewport, columnIndex);
    const rect = calculateColumnResizerRect(theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

    const clipRegion = new Path2D();
    clipRegion.rect(0, 0, layout.tableWidth, theme.rowHeight);

    submitDraw(uiContext, {
      type: "rect",
      ...rect,
      color: theme.columnResizerColor,
      sortOrder: 2,
      clipRegion
    });
  }

  if (layout.overflowX) {
    if (theme.scrollbarTrackColor) {
      submitDraw(uiContext, {
        type: "rect",
        color: theme.scrollbarTrackColor,
        ...layout.hsbRect
      });
    }

    doHorizontalScrollbarThumb(ct, layout);
  }

  if (layout.overflowY) {
    if (theme.scrollbarTrackColor) {
      submitDraw(uiContext, {
        type: "rect",
        color: theme.scrollbarTrackColor,
        ...layout.vsbRect
      });
    }

    doVerticalScrolbarThumb(ct, layout);
  }

  // Draw outer canvas border
  submitDraw(uiContext, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: 0,
    length: canvasSize.width,
    color: theme.tableBorderColor
  });

  submitDraw(uiContext, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: canvasSize.height - 1,
    length: canvasSize.width,
    color: theme.tableBorderColor
  });

  submitDraw(uiContext, {
    type: "line",
    orientation: "vertical",
    x: 0,
    y: 0,
    length: canvasSize.height,
    color: theme.tableBorderColor
  });

  submitDraw(uiContext, {
    type: "line",
    orientation: "vertical",
    x: canvasSize.width - 1,
    y: 0,
    length: canvasSize.height,
    color: theme.tableBorderColor
  });

  // Draw header bottom border
  submitDraw(uiContext, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: theme.rowHeight,
    length: canvasSize.width,
    color: theme.tableBorderColor
  });

  // If horizontal scrollbar is visible, draw its border, otherwise,
  // draw table content right border
  if (layout.overflowX) {
    submitDraw(uiContext, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: layout.hsbRect.y - 1,
      length: canvasSize.width,
      color: theme.tableBorderColor
    });
  } else {
    submitDraw(uiContext, {
      type: "line",
      orientation: "vertical",
      x: layout.gridWidth,
      y: 0,
      length: layout.gridHeight,
      color: theme.tableBorderColor
    });
  }

  // If vertical scrollbar is visible, draw its border, otherwise,
  // draw table content bottom border
  if (layout.overflowY) {
    submitDraw(uiContext, {
      type: "line",
      orientation: "vertical",
      x: layout.vsbRect.x - 1,
      y: 0,
      length: canvasSize.height,
      color: theme.tableBorderColor
    });
  } else {
    submitDraw(uiContext, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: layout.gridHeight,
      length: layout.gridWidth,
      color: theme.tableBorderColor
    });
  }

  // Draw grid horizontal lines
  for (let rowIndex = viewport.rowStart + 1; rowIndex < viewport.rowEnd; rowIndex++) {
    const rowPos = viewport.rowPositions.get(rowIndex)!;

    submitDraw(uiContext, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: rowPos,
      length: layout.gridWidth,
      color: theme.tableBorderColor
    });
  }

  for (let columnIndex = viewport.columnStart + 1; columnIndex < viewport.columnEnd; columnIndex++) {
    const columnPos = viewport.columnPositions.get(columnIndex)!;

    submitDraw(uiContext, {
      type: "line",
      orientation: "vertical",
      x: columnPos,
      y: 0,
      length: layout.gridHeight,
      color: theme.tableBorderColor
    });
  }

  {
    const font = {
      family: theme.fontFamily,
      size: theme.fontSize,
      style: theme.headerFontStyle ?? theme.fontStyle,
      color: theme.headerFontColor ?? theme.fontColor
    } as const;

    const clipRegion = new Path2D();
    clipRegion.rect(0, 0, layout.tableWidth, theme.rowHeight);

    for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
      const columnState = columnStates[columnIndex];

      const columnPos = viewport.columnPositions.get(columnIndex)!;

      const x = columnPos + theme.cellPadding;
      const y = theme.rowHeight / 2;
      const maxWidth = columnState.width - theme.cellPadding * 2;
      const text = columnState.title;

      submitDraw(uiContext, {
        type: "text",
        x,
        y,
        text,
        font,
        maxWidth,
        ellipsis: true,
        clipRegion
      });
    }
  }

  {
    const font = {
      family: theme.fontFamily,
      size: theme.fontSize,
      style: theme.bodyFontStyle ?? theme.fontStyle,
      color: theme.bodyFontColor ?? theme.fontColor
    } as const;

    const clipRegion = new Path2D();
    clipRegion.rect(0, theme.rowHeight, layout.bodyWidth, layout.bodyHeight);

    for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
      const columnState = columnStates[columnIndex];

      const columnPos = viewport.columnPositions.get(columnIndex)!;

      const x = columnPos + theme.cellPadding;
      const maxWidth = columnState.width - theme.cellPadding * 2;

      for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
        const dataRow = dataRows[rowIndex];

        const rowPos = viewport.rowPositions.get(rowIndex)!;

        const y = rowPos + theme.rowHeight / 2;
        const text = dataRow[columnState.field];

        submitDraw(uiContext, {
          type: "text",
          x,
          y,
          text,
          font,
          maxWidth,
          ellipsis: true,
          clipRegion
        });
      }
    }
  }

  /*
  {
    // @Todo Move this to the top
    const currMousePosition = getCurrentMousePosition(uiContext);

    // @Todo Make a craeteUiId function
    const uiId = {
      item: `col-resizer-${columnBeforeStart}`,
      index: columnBeforeStart
    };

    if (isActive(uiContext, uiId) && columnBeforeStart < columnStart) {
      const columnState = columnStates[columnBeforeStart];

      const columnPos = columnPositions.get(columnBeforeStart);

      const x = columnPos + columnState.width - COLUMN_RESIZER_WIDTH;
      const y = 0;
      const width = (COLUMN_RESIZER_WIDTH * 2) + 1;
      const height = rowHeight;

      const rect = { x, y, width, height };

      const props = {
        rect,
        hotColor: columnResizerColor,
        activeColor: columnResizerColor
      };

      if (doDraggable(ct, uiId, props)) {
        const columnWidth = Math.max(currMousePosition.x - columnPos, MIN_COLUMN_WIDTH);
        columnState.width = columnWidth;
      }
    }
  }
  */

  

  endFrame(uiContext);

  ct.rafId = requestAnimationFrame(() => update(ct));
}

function reflow(ct: CanvasTable): Layout {
  const { uiContext, columnStates, dataRows, theme } = ct;
  const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = theme;

  let contentWidth = 0;
  for (const { width } of columnStates) {
    contentWidth += width;
  }
  const contentHeight = dataRows.length * rowHeight;

  const canvasSize = getCanvasSize(uiContext);
  const outerTableWidth  = canvasSize.width - 1;
  const outerTableHeight = canvasSize.height - 1;

  const innerTableWidth  = outerTableWidth  - scrollbarThickness - 1;
  const innerTableHeight = outerTableHeight - scrollbarThickness - 1;

  const outerBodyHeight = outerTableHeight - rowHeight;
  const innerBodyHeight = innerTableHeight - rowHeight;

  let overflowX: boolean;
  let overflowY: boolean;
  if (outerTableWidth >= contentWidth && outerBodyHeight >= contentHeight) {
    overflowX = overflowY = false;
  } else {
    overflowX = innerTableWidth  < contentWidth;
    overflowY = innerBodyHeight < contentHeight;
  }

  let tableWidth:   number;
  let bodyWidth:   number;

  if (overflowY) {
    tableWidth = bodyWidth = innerTableWidth;
  } else {
    tableWidth = bodyWidth = outerTableWidth;
  }

  let tableHeight: number;
  let bodyHeight: number;

  if (overflowX) {
    tableHeight = innerTableHeight;
    bodyHeight = innerBodyHeight;
  } else {
    tableHeight = outerTableHeight;
    bodyHeight = outerBodyHeight;
  }

  const scrollWidth  = Math.max(contentWidth,  bodyWidth);
  const scrollHeight = Math.max(contentHeight, bodyHeight);

  const maxScrollX = scrollWidth  - bodyWidth;
  const maxScrollY = scrollHeight - bodyHeight;

  const gridWidth  = Math.min(tableWidth,  contentWidth);
  const gridHeight = Math.min(tableHeight, contentHeight + rowHeight);

  const hsbRect = {
    x: 1,
    y: tableHeight + 1,
    width: tableWidth - 1,
    height: scrollbarThickness
  };

  const hsbTrackRect = {
    x: hsbRect.x + scrollbarTrackMargin,
    y: hsbRect.y + scrollbarTrackMargin,
    width:  hsbRect.width  - (scrollbarTrackMargin * 2),
    height: hsbRect.height - (scrollbarTrackMargin * 2)
  };

  const vsbRect = {
    x: tableWidth + 1,
    y: rowHeight + 1,
    width: scrollbarThickness,
    height: bodyHeight - 1
  };

  const vsbTrackRect = {
    x: vsbRect.x + scrollbarTrackMargin,
    y: vsbRect.y + scrollbarTrackMargin,
    width:  vsbRect.width  - (scrollbarTrackMargin * 2),
    height: vsbRect.height - (scrollbarTrackMargin * 2)
  };

  return {
    contentWidth,
    contentHeight,
    tableWidth,
    tableHeight,
    bodyWidth,
    bodyHeight,
    scrollWidth,
    scrollHeight,
    maxScrollX,
    maxScrollY,
    gridWidth,
    gridHeight,
    hsbRect,
    hsbTrackRect,
    vsbRect,
    vsbTrackRect,
    overflowX,
    overflowY
  };
}

function calculateViewport(ct: CanvasTable, layout: Layout): Viewport {
  const { columnStates, dataRows, theme, scrollPos } = ct;

  let columnStart = 0;
  let columnPos = 0;
  const columnPositions = new Map();

  for (; columnStart < columnStates.length; columnStart++) {
    const columnState = columnStates[columnStart];
    const nextColumnPos = columnPos + columnState.width;
    if (nextColumnPos > scrollPos.x) {
      break;
    }

    columnPositions.set(columnStart, columnPos - scrollPos.x);

    columnPos = nextColumnPos;
  }

  const scrollRight = scrollPos.x + layout.bodyWidth;

  let columnEnd = columnStart;
  for (; columnEnd < columnStates.length; columnEnd++) {
    if (columnPos >= scrollRight) {
      break;
    }

    columnPositions.set(columnEnd, columnPos - scrollPos.x);

    const columnState = columnStates[columnEnd];
    columnPos += columnState.width;
  }

  const rowStart = Math.floor(scrollPos.y / theme.rowHeight);

  const scrollBottom = scrollPos.y + layout.bodyHeight;
  const rowEnd = Math.min(Math.ceil(scrollBottom / theme.rowHeight), dataRows.length);

  const rowPositions = new Map();
  for (let i = rowStart; i < rowEnd; i++) {
    const rowPosition = i * theme.rowHeight + theme.rowHeight - scrollPos.y;
    rowPositions.set(i, rowPosition);
  }

  const tableEndPosition = layout.scrollWidth - scrollPos.x;

  return {
    columnStart,
    columnEnd,
    columnPositions,
    rowStart,
    rowEnd,
    rowPositions,
    tableEndPosition
  };
}

function doHorizontalScrollbarThumb(ct: CanvasTable, layout: Layout) {
  const { uiContext, theme, scrollPos } = ct;
  const { bodyWidth, scrollWidth, maxScrollX, hsbTrackRect } = layout;

  const hsbThumbWidth = Math.max((bodyWidth / scrollWidth) * hsbTrackRect.width, MIN_THUMB_LENGTH);
  const hsbThumbHeight = hsbTrackRect.height;

  const hsbThumbMinX = hsbTrackRect.x;
  const hsbThumbMaxX = hsbTrackRect.x + hsbTrackRect.width - hsbThumbWidth;

  let hsbThumbX = scale(scrollPos.x, 0, maxScrollX, hsbThumbMinX, hsbThumbMaxX);
  const hsbThumbY = hsbTrackRect.y;

  let dragging = false;

  const hsbThumbId = createUiId("hsb-thumb");
  if (isActive(uiContext, hsbThumbId)) {
    dragging = true;
  } else if (isHot(uiContext, hsbThumbId)) {
    if (isMousePressed(uiContext, MOUSE_BUTTONS.PRIMARY)) {
      setAsActive(uiContext, hsbThumbId);

      const itemDragStartPosition = {
        x: hsbThumbX,
        y: hsbThumbY
      };
      setDragAnchorPosition(uiContext, itemDragStartPosition);
    }
  }

  if (dragging) {
    const dragAnchorPosition = getDragAnchorPosition(uiContext);
    const dragDistance = getDragDistance(uiContext);

    hsbThumbX = clamp(dragAnchorPosition.x + dragDistance.x, hsbThumbMinX, hsbThumbMaxX);

    const newScrollX = Math.round(scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX));
    scrollPos.x = newScrollX;
  }

  const currentMousePosition = getCurrentMousePosition(uiContext);

  const hsbThumbRect = {
    x: hsbThumbX,
    y: hsbThumbY,
    width:  hsbThumbWidth,
    height: hsbThumbHeight,
  };

  const inside = pointInRect(currentMousePosition, hsbThumbRect);
  if (inside) {
    setAsHot(uiContext, hsbThumbId);
  } else {
    unsetAsHot(uiContext, hsbThumbId);
  }

  let color: string;
  if (isActive(uiContext, hsbThumbId)) {
    color = theme.scrollbarThumbPressedColor
      ?? theme.scrollbarThumbHoverColor
      ?? theme.scrollbarThumbColor;
  } else if (isHot(uiContext, hsbThumbId)) {
    color = theme.scrollbarThumbHoverColor
      ?? theme.scrollbarThumbColor;
  } else {
    color = theme.scrollbarThumbColor;
  }

  submitDraw(uiContext, {
    type: "rect",
    color,
    ...hsbThumbRect
  });
}

function doVerticalScrolbarThumb(ct: CanvasTable, layout: Layout) {
  const { uiContext, theme, scrollPos } = ct;
  const { bodyHeight, scrollHeight, maxScrollY, vsbTrackRect } = layout;

  const vsbThumbHeight = Math.max((bodyHeight / scrollHeight) * vsbTrackRect.height, MIN_THUMB_LENGTH);
  const vsbThumbWidth = vsbTrackRect.width;

  const vsbThumbMinY = vsbTrackRect.y;
  const vsbThumbMaxY = vsbTrackRect.y + vsbTrackRect.height - vsbThumbHeight;

  let vsbThumbY = scale(scrollPos.y, 0, maxScrollY, vsbThumbMinY, vsbThumbMaxY);
  const vsbThumbX = vsbTrackRect.x;

  let dragging = false;

  const vsbThumbId = createUiId("vs-thumb");
  if (isActive(uiContext, vsbThumbId)) {
    dragging = true;
  } else if (isHot(uiContext, vsbThumbId)) {
    if (isMousePressed(uiContext, MOUSE_BUTTONS.PRIMARY)) {
      setAsActive(uiContext, vsbThumbId);

      const itemDragStartPosition = {
        x: vsbThumbX,
        y: vsbThumbY
      };
      setDragAnchorPosition(uiContext, itemDragStartPosition);
    }
  }

  if (dragging) {
    const dragAnchorPosition = getDragAnchorPosition(uiContext);
    const dragDistance = getDragDistance(uiContext);

    vsbThumbY = clamp(dragAnchorPosition.y + dragDistance.y, vsbThumbMinY, vsbThumbMaxY);
    const newScrollY = Math.round(scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY));
    scrollPos.y = newScrollY;
  }

  const currentMousePosition = getCurrentMousePosition(uiContext);

  const vsbThumbRect = {
    x: vsbThumbX,
    y: vsbThumbY,
    width: vsbThumbWidth,
    height: vsbThumbHeight
  };

  const inside = pointInRect(currentMousePosition, vsbThumbRect);
  if (inside) {
    setAsHot(uiContext, vsbThumbId);
  } else {
    unsetAsHot(uiContext, vsbThumbId);
  }

  let color: string;
  if (isActive(uiContext, vsbThumbId)) {
    color = theme.scrollbarThumbPressedColor
      ?? theme.scrollbarThumbHoverColor
      ?? theme.scrollbarThumbColor;
  } else if (isHot(uiContext, vsbThumbId)) {
    color = theme.scrollbarThumbHoverColor
      ?? theme.scrollbarThumbColor;
  } else {
    color = theme.scrollbarThumbColor;
  }

  submitDraw(uiContext, {
    type: "rect",
    color,
    ...vsbThumbRect
  });
}

function calculateColumnResizerRect(rowHeight: number, tableEndPosition: number, columnEndPosition: number) {
  const right = Math.min(columnEndPosition + COLUMN_RESIZER_LEFT_WIDTH + 1, tableEndPosition);
  const left = right - COLUMN_RESIZER_WIDTH;

  const rect = {
    x: left,
    y: 1,
    width: COLUMN_RESIZER_WIDTH,
    height: rowHeight - 1
  }

  return rect;
}

function getColumnEndPosition(ct: CanvasTable, viewport: Viewport, columnIndex: number) {
  const { columnStates } = ct;

  const columnState = columnStates[columnIndex];
  const columnPosStart = viewport.columnPositions.get(columnIndex)!;
  const columnPosEnd = columnPosStart + columnState.width;

  return columnPosEnd;
}

export function createRect(): Rect;
export function createRect(partial: Partial<Rect> | undefined): Rect;
export function createRect(x: number, y: number, width: number, height: number): Rect;
export function createRect(...args: any[]): Rect {
  if (args.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  } else if (args.length === 1) {
    return { x: 0, y: 0, width: 1, height: 1, ...args[0] };
  } else {
    return { x: args[0], y: args[1], width: args[2], height: args[3] };
  }
}

function pointInRect(point: Vector, rect: Rect) {
  return point.x >= rect.x && point.x < rect.x + rect.width &&
         point.y >= rect.y && point.y < rect.y + rect.height;
}

function columnDefsToColumnStates(columnDefs: ColumnDef[]) {
  const columnStates = [] as ColumnState[];
  for (const { width, ...rest } of columnDefs) {
    const _width = width ?? DEFAULT_COLUMN_WIDTH;
    columnStates.push({...rest, width: _width });
  }
  return columnStates;
}

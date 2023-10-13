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
  getItemDragStartPosition,
  setItemDragStartPosition,
  getDragDistance,
  MOUSE_BUTTONS,
  createUiId,
  isMouseReleased
} from "./ui";
import { defaultTheme } from "./default-theme";
import { shallowMerge, scale, clamp } from "./utils";
import {
  COLUMN_RESIZER_LEFT_WIDTH,
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

  const indexOfColumnBeingResized = -1;

  const ct = {
    uiContext,
    columnStates,
    dataRows,
    theme,
    scrollPos,
    indexOfColumnBeingResized
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

  if (isMouseReleased(uiContext, MOUSE_BUTTONS.PRIMARY)) {
    ct.indexOfColumnBeingResized = -1;
  }

  const canvasSize = getCanvasSize(uiContext);

  const layout = reflow(ct);

  const viewport = calculateViewport(ct, layout);

  const currentMousePosition = getCurrentMousePosition(uiContext);

  scrollPos.x = Math.min(scrollPos.x, layout.maxScrollX);
  scrollPos.y = Math.min(scrollPos.y, layout.maxScrollY);

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

  let indexOfColumnBeingHovered = -1;
  for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
    const rect = calculateColumnResizerRect(ct, layout, viewport, columnIndex);
    if (pointInRect(currentMousePosition, rect)) {
      indexOfColumnBeingHovered = columnIndex;
      if (isMousePressed(uiContext, MOUSE_BUTTONS.PRIMARY)) {
        ct.indexOfColumnBeingResized = columnIndex;
      }
      break;
    }
  }

  if (ct.indexOfColumnBeingResized !== -1) {
    const columnState = columnStates[ct.indexOfColumnBeingResized];
    const columnPos = viewport.columnPositions.get(ct.indexOfColumnBeingResized)!;

    const columnWidth = Math.max(currentMousePosition.x - columnPos, MIN_COLUMN_WIDTH);
    columnState.width = columnWidth;

    const newLayout = reflow(ct);
    shallowMerge(layout, newLayout);

    const newViewport = calculateViewport(ct, layout);
    shallowMerge(viewport, newViewport);
  }

  const indexOfColumnWhoseResizerWillBeDrawn = ct.indexOfColumnBeingResized !== -1
    ? ct.indexOfColumnBeingResized
    : indexOfColumnBeingHovered;

  if (indexOfColumnWhoseResizerWillBeDrawn !== -1) {
    const rect = calculateColumnResizerRect(ct, layout, viewport, indexOfColumnWhoseResizerWillBeDrawn);

    submitDraw(uiContext, {
      type: "rect",
      ...rect,
      color: "red",
      sortOrder: 2
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
  const { columnStates, dataRows, theme, scrollPos, } = ct;
  const { rowHeight } = theme;

  const { bodyWidth, bodyHeight } = layout;

  let columnStart = 0;
  let columnPos = 0;
  const columnPositions = new Map();
  // @Note: Why subtract 1 from length here?
  for (; columnStart < columnStates.length - 1; columnStart++) {
    const columnState = columnStates[columnStart];
    const nextColumnPos = columnPos + columnState.width;
    if (nextColumnPos > scrollPos.x) {
      break;
    }

    columnPositions.set(columnStart, columnPos - scrollPos.x);

    columnPos = nextColumnPos;
  }

  const scrollRight = scrollPos.x + bodyWidth;
  let columnEnd = columnStart;
  for (; columnEnd < columnStates.length; columnEnd++) {
    if (columnPos >= scrollRight) {
      break;
    }

    columnPositions.set(columnEnd, columnPos - scrollPos.x);

    const columnState = columnStates[columnEnd];
    columnPos += columnState.width;
  }

  const rowStart = Math.floor(scrollPos.y / rowHeight);

  const scrollBottom = scrollPos.y + bodyHeight;
  const rowEnd = Math.min(Math.ceil(scrollBottom / rowHeight), dataRows.length);

  const rowPositions = new Map();
  for (let i = rowStart; i < rowEnd; i++) {
    const rowPosition = i * rowHeight + rowHeight - scrollPos.y;
    rowPositions.set(i, rowPosition);
  }

  return {
    columnStart,
    columnEnd,
    columnPositions,
    rowStart,
    rowEnd,
    rowPositions
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
      setItemDragStartPosition(uiContext, itemDragStartPosition);
    }
  }

  if (dragging) {
    const itemDragStartPosition = getItemDragStartPosition(uiContext);
    const dragDistance = getDragDistance(uiContext);

    hsbThumbX = clamp(itemDragStartPosition.x + dragDistance.x, hsbThumbMinX, hsbThumbMaxX);

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
      setItemDragStartPosition(uiContext, itemDragStartPosition);
    }
  }

  if (dragging) {
    const itemDragStartPosition = getItemDragStartPosition(uiContext);
    const dragDistance = getDragDistance(uiContext);

    vsbThumbY = clamp(itemDragStartPosition.y + dragDistance.y, vsbThumbMinY, vsbThumbMaxY);
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

function calculateColumnResizerRect(
  ct: CanvasTable,
  layout: Layout,
  viewport: Viewport,
  columnIndex: number
) {
  const { columnStates, theme } = ct;
  const { gridWidth } = layout;
  const { columnPositions } = viewport;

  const rectWidth = (COLUMN_RESIZER_LEFT_WIDTH * 2) + 1;

  const x = columnIndex < columnStates.length - 1
    ? columnPositions.get(columnIndex + 1)! - COLUMN_RESIZER_LEFT_WIDTH
    : gridWidth - rectWidth;

  const rect = {
    x,
    y: 1,
    width: rectWidth,
    height: theme.rowHeight - 1
  }

  return rect;
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
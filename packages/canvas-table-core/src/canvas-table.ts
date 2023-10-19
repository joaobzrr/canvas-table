import * as UI from "./ui";
import { defaultTheme } from "./default-theme";
import { shallowMerge, scale, clamp, isNumber } from "./utils";
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
  const { columnDefs, dataRows,  container, size, onSelect } = params;

  const ui = UI.create({ container: container, size: size });

  const columnStates = columnDefsToColumnStates(columnDefs);

  const theme = shallowMerge({}, defaultTheme, params.theme);

  const scrollPos = { x: 0, y: 0 };

  const selectedRowId = null;

  const ct = {
    ui,
    columnStates,
    dataRows,
    theme,
    scrollPos,
    selectedRowId,
    onSelect
  } as CanvasTable;

  const rafId = requestAnimationFrame(() => update(ct));
  ct.rafId = rafId;

  return ct;
}

export function set(ct: CanvasTable, params: Partial<SetCanvasTableParams>) {
  if (params.size) {
    UI.setCanvasSize(ct.ui, params.size);
  }

  if (params.theme) {
    ct.theme = shallowMerge({}, defaultTheme, params.theme);
  }
}

export function cleanup(ct: CanvasTable) {
  UI.removeDocumentEventListeners(ct.ui);
  cancelAnimationFrame(ct.rafId);
}

function update(ct: CanvasTable) {
  const { ui, columnStates, dataRows, theme, scrollPos } = ct;

  UI.beginFrame(ui);

  const canvasSize = UI.getCanvasSize(ui);

  let layout = reflow(ct);
  let viewport = calculateViewport(ct, layout);

  if (theme.tableBackgroundColor) {
    UI.submitDraw(ui, {
      type: "rect",
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
      color: theme.tableBackgroundColor
    });
  }

  if (theme.bodyBackgroundColor) {
    UI.submitDraw(ui, {
      type: "rect",
      color: theme.bodyBackgroundColor,
      ...layout.bodyRect
    });
  }

  if (theme.headerBackgroundColor) {
    UI.submitDraw(ui, {
      type: "rect",
      color: theme.headerBackgroundColor,
      ...layout.headerRect
    });
  }

  for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
    const columnEndPosition = getColumnEndPosition(ct, viewport, columnIndex);
    const rect = calculateColumnResizerRect(theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

    if (UI.isMouseInRect(ui, rect)) {
      UI.setAsHot(ui, "column-resizer", columnIndex);

      if (UI.isMousePressed(ui, UI.MOUSE_BUTTONS.PRIMARY)) {
        UI.setAsActive(ui, "column-resizer", columnIndex);

        const dragAnchorPosition = createVector(columnEndPosition, rect.y);
        ui.dragAnchorPosition = dragAnchorPosition;
      }

      break;
    } else {
      UI.unsetAsHot(ui, "column-resizer", columnIndex);
    }
  }

  if (UI.isActive(ui, "column-resizer")) {
    const id = ui.active!;
    const columnIndex = id.index!;

    const columnState = columnStates[columnIndex];
    const columnPos = viewport.columnPositions.get(columnIndex)!;

    const calculatedColumnWidth = ui.dragAnchorPosition.x + ui.dragDistance.x - columnPos;
    const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
    columnState.width = columnWidth;

    layout = reflow(ct);

    scrollPos.x = Math.min(scrollPos.x, layout.maxScrollX);
    scrollPos.y = Math.min(scrollPos.y, layout.maxScrollY);

    viewport = calculateViewport(ct, layout);
  }

  if (UI.isActive(ui, "column-resizer") || UI.isHot(ui, "column-resizer")) {
    const id = ui.active ?? ui.hot!;
    const columnIndex = id.index!;

    const columnEndPosition = getColumnEndPosition(ct, viewport, columnIndex);
    const rect = calculateColumnResizerRect(theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

    const clipRegion = pathFromRect(layout.headerRect);

    UI.submitDraw(ui, {
      type: "rect",
      ...rect,
      color: theme.columnResizerColor,
      sortOrder: 2,
      clipRegion
    });
  }

  if (layout.overflowX) {
    if (theme.scrollbarTrackColor) {
      UI.submitDraw(ui, {
        type: "rect",
        color: theme.scrollbarTrackColor,
        ...layout.hsbRect
      });
    }

    doHorizontalScrollbarThumb(ct, layout);
  }

  if (layout.overflowY) {
    if (theme.scrollbarTrackColor) {
      UI.submitDraw(ui, {
        type: "rect",
        color: theme.scrollbarTrackColor,
        ...layout.vsbRect
      });
    }

    doVerticalScrolbarThumb(ct, layout);
  }

  if (UI.isMouseInRect(ui, layout.bodyRect)) {
    for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
      const rect = calculateRowRect(ct, layout, viewport, rowIndex);

      if (UI.isMouseInRect(ui, rect)) {
        UI.setAsHot(ui, "row-hover", rowIndex);

        if (UI.isMousePressed(ui, UI.MOUSE_BUTTONS.PRIMARY)) {
          const dataRow = dataRows[rowIndex];
          ct.selectedRowId = dataRow.id;

          if (ct.onSelect) {
            ct.onSelect(dataRow.id, dataRow);
          }
        }

        break;
      }
    }
  } else {
    UI.unsetAsHot(ui, "row-hover");
  }

  if (UI.isHot(ui, "row-hover") && theme.hoveredRowColor) {
    const id = ui.hot!;
    const rowIndex = id.index!;

    const rect = calculateRowRect(ct, layout, viewport, rowIndex);

    const clipRegion = pathFromRect(layout.bodyRect);

    UI.submitDraw(ui, {
      type: "rect",
      color: theme.hoveredRowColor,
      clipRegion: clipRegion,
      ...rect,
    });
  }

  for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
    const dataRow = dataRows[rowIndex];
    if (dataRow.id === ct.selectedRowId) {
      const rect = calculateRowRect(ct, layout, viewport, rowIndex);

      const clipRegion = pathFromRect(layout.bodyRect);

      UI.submitDraw(ui, {
        type: "rect",
        color: theme.selectedRowColor,
        clipRegion: clipRegion,
        ...rect
      });
    }
  }

  // Draw outer canvas border
  UI.submitDraw(ui, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: 0,
    length: canvasSize.width,
    color: theme.tableBorderColor
  });

  UI.submitDraw(ui, {
    type: "line",
    orientation: "horizontal",
    x: 0,
    y: canvasSize.height - 1,
    length: canvasSize.width,
    color: theme.tableBorderColor
  });

  UI.submitDraw(ui, {
    type: "line",
    orientation: "vertical",
    x: 0,
    y: 0,
    length: canvasSize.height,
    color: theme.tableBorderColor
  });

  UI.submitDraw(ui, {
    type: "line",
    orientation: "vertical",
    x: canvasSize.width - 1,
    y: 0,
    length: canvasSize.height,
    color: theme.tableBorderColor
  });

  // Draw header bottom border
  UI.submitDraw(ui, {
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
    UI.submitDraw(ui, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: layout.hsbRect.y - 1,
      length: canvasSize.width,
      color: theme.tableBorderColor
    });
  } else {
    UI.submitDraw(ui, {
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
    UI.submitDraw(ui, {
      type: "line",
      orientation: "vertical",
      x: layout.vsbRect.x - 1,
      y: 0,
      length: canvasSize.height,
      color: theme.tableBorderColor
    });
  } else {
    UI.submitDraw(ui, {
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

    UI.submitDraw(ui, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: rowPos,
      length: layout.gridWidth,
      color: theme.tableBorderColor
    });
  }

  // Draw grid vertical lines
  for (let columnIndex = viewport.columnStart + 1; columnIndex < viewport.columnEnd; columnIndex++) {
    const columnPos = viewport.columnPositions.get(columnIndex)!;

    UI.submitDraw(ui, {
      type: "line",
      orientation: "vertical",
      x: columnPos,
      y: 0,
      length: layout.gridHeight,
      color: theme.tableBorderColor
    });
  }

  {
    const fontStyle = theme.headerFontStyle ?? theme.fontStyle;
    const font = createFontSpecifier(theme.fontFamily, theme.fontSize, fontStyle);

    const fontColor = theme.headerFontColor ?? theme.fontColor;

    const clipRegion = pathFromRect(layout.headerRect);

    for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
      const columnState = columnStates[columnIndex];

      const columnPos = viewport.columnPositions.get(columnIndex)!;

      const x = columnPos + theme.cellPadding;
      const y = theme.rowHeight / 2;
      const maxWidth = columnState.width - theme.cellPadding * 2;
      const text = columnState.title;

      UI.submitDraw(ui, {
        type: "text",
        x,
        y,
        color: fontColor,
        text,
        font,
        maxWidth,
        clipRegion
      });
    }
  }

  {
    const fontStyle = theme.bodyFontStyle ?? theme.fontStyle;
    const font = createFontSpecifier(theme.fontFamily, theme.fontSize, fontStyle);

    const fontColor = theme.bodyFontColor ?? theme.fontColor;

    const clipRegion = pathFromRect(layout.bodyRect);

    for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
      const columnState = columnStates[columnIndex];

      const columnPos = viewport.columnPositions.get(columnIndex)!;

      const x = columnPos + theme.cellPadding;
      const maxWidth = columnState.width - theme.cellPadding * 2;

      for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
        const dataRow = dataRows[rowIndex];

        const rowPos = viewport.rowPositions.get(rowIndex)!;

        const y = rowPos + theme.rowHeight / 2;

        const value = dataRow[columnState.field];
        const text = isNumber(value) ? value.toString() : value as string;

        UI.submitDraw(ui, {
          type: "text",
          x,
          y,
          color: fontColor,
          text,
          font,
          maxWidth,
          clipRegion
        });
      }
    }
  }

  UI.endFrame(ui);
  ct.rafId = requestAnimationFrame(() => update(ct));
}

function reflow(ct: CanvasTable): Layout {
  const { ui, columnStates, dataRows, theme } = ct;
  const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = theme;

  let contentWidth = 0;
  for (const { width } of columnStates) {
    contentWidth += width;
  }
  const contentHeight = dataRows.length * rowHeight;

  const canvasSize = UI.getCanvasSize(ui);
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

  const tableRect = {
    x: 0,
    y: 0,
    width: tableWidth,
    height: tableHeight
  };

  const bodyRect = {
    x: 0,
    y: rowHeight,
    width: bodyWidth,
    height: bodyHeight
  };

  const headerRect = {
    x: 0,
    y: 0,
    width: tableWidth,
    height: rowHeight
  };

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
    tableRect,
    bodyRect,
    headerRect,
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

  const scrollRight = scrollPos.x + layout.bodyRect.width;

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

  const scrollBottom = scrollPos.y + layout.bodyRect.height;
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
  const { ui, theme, scrollPos } = ct;
  const { scrollWidth, maxScrollX, hsbTrackRect } = layout;

  const hsbThumbWidth = Math.max((layout.bodyRect.width / scrollWidth) * hsbTrackRect.width, MIN_THUMB_LENGTH);
  const hsbThumbHeight = hsbTrackRect.height;

  const hsbThumbMinX = hsbTrackRect.x;
  const hsbThumbMaxX = hsbTrackRect.x + hsbTrackRect.width - hsbThumbWidth;

  let hsbThumbX = scale(scrollPos.x, 0, maxScrollX, hsbThumbMinX, hsbThumbMaxX);
  const hsbThumbY = hsbTrackRect.y;

  let dragging = false;

  if (UI.isActive(ui, "hsb-thumb")) {
    dragging = true;
  } else if (UI.isHot(ui, "hsb-thumb")) {
    if (UI.isMousePressed(ui, UI.MOUSE_BUTTONS.PRIMARY)) {
      UI.setAsActive(ui, "hsb-thumb");

      const dragAnchorPosition = createVector(hsbThumbX, hsbThumbY);
      ui.dragAnchorPosition = dragAnchorPosition;
    }
  }

  if (dragging) {
    hsbThumbX = clamp(ui.dragAnchorPosition.x + ui.dragDistance.x, hsbThumbMinX, hsbThumbMaxX);
    const newScrollX = Math.round(scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX));
    scrollPos.x = newScrollX;
  }

  const hsbThumbRect = {
    x: hsbThumbX,
    y: hsbThumbY,
    width:  hsbThumbWidth,
    height: hsbThumbHeight,
  };

  const inside = UI.isMouseInRect(ui, hsbThumbRect);
  if (inside) {
    UI.setAsHot(ui, "hsb-thumb");
  } else {
    UI.unsetAsHot(ui, "hsb-thumb");
  }

  let color: string;
  if (UI.isActive(ui, "hsb-thumb")) {
    color = theme.scrollbarThumbPressedColor ?? theme.scrollbarThumbHoverColor ?? theme.scrollbarThumbColor;
  } else if (UI.isHot(ui, "hsb-thumb")) {
    color = theme.scrollbarThumbHoverColor ?? theme.scrollbarThumbColor;
  } else {
    color = theme.scrollbarThumbColor;
  }

  UI.submitDraw(ui, {
    type: "rect",
    color,
    sortOrder: 2,
    ...hsbThumbRect
  });
}

function doVerticalScrolbarThumb(ct: CanvasTable, layout: Layout) {
  const { ui, theme, scrollPos } = ct;
  const { scrollHeight, maxScrollY, vsbTrackRect } = layout;

  const vsbThumbHeight = Math.max((layout.bodyRect.height / scrollHeight) * vsbTrackRect.height, MIN_THUMB_LENGTH);
  const vsbThumbWidth = vsbTrackRect.width;

  const vsbThumbMinY = vsbTrackRect.y;
  const vsbThumbMaxY = vsbTrackRect.y + vsbTrackRect.height - vsbThumbHeight;

  let vsbThumbY = scale(scrollPos.y, 0, maxScrollY, vsbThumbMinY, vsbThumbMaxY);
  const vsbThumbX = vsbTrackRect.x;

  let dragging = false;

  if (UI.isActive(ui, "vsb-thumb")) {
    dragging = true;
  } else if (UI.isHot(ui, "vsb-thumb")) {
    if (UI.isMousePressed(ui, UI.MOUSE_BUTTONS.PRIMARY)) {
      UI.setAsActive(ui, "vsb-thumb");

      const dragAnchorPosition = createVector(vsbThumbX, vsbThumbY);
      ui.dragAnchorPosition = dragAnchorPosition;
    }
  }

  if (dragging) {
    vsbThumbY = clamp(ui.dragAnchorPosition.y + ui.dragDistance.y, vsbThumbMinY, vsbThumbMaxY);
    const newScrollY = Math.round(scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY));
    scrollPos.y = newScrollY;
  }

  const vsbThumbRect = {
    x: vsbThumbX,
    y: vsbThumbY,
    width: vsbThumbWidth,
    height: vsbThumbHeight
  };

  const inside = UI.isMouseInRect(ui, vsbThumbRect);
  if (inside) {
    UI.setAsHot(ui, "vsb-thumb");
  } else {
    UI.unsetAsHot(ui, "vsb-thumb");
  }

  let color: string;
  if (UI.isActive(ui, "vsb-thumb")) {
    color = theme.scrollbarThumbPressedColor ?? theme.scrollbarThumbHoverColor ?? theme.scrollbarThumbColor;
  } else if (UI.isHot(ui, "vsb-thumb")) {
    color = theme.scrollbarThumbHoverColor ?? theme.scrollbarThumbColor;
  } else {
    color = theme.scrollbarThumbColor;
  }

  UI.submitDraw(ui, {
    type: "rect",
    color,
    sortOrder: 2,
    ...vsbThumbRect
  });
}

function getColumnEndPosition(ct: CanvasTable, viewport: Viewport, columnIndex: number) {
  const { columnStates } = ct;

  const columnState = columnStates[columnIndex];
  const columnPosStart = viewport.columnPositions.get(columnIndex)!;
  const columnPosEnd = columnPosStart + columnState.width;

  return columnPosEnd;
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

function calculateRowRect(ct: CanvasTable, layout: Layout, viewport: Viewport, rowIndex: number) {
  return {
    x: 0,
    y: viewport.rowPositions.get(rowIndex)!,
    width: layout.gridWidth,
    height: ct.theme.rowHeight
  };
}

function pathFromRect(rect: Rect) {
  const path = new Path2D();
  path.rect(rect.x, rect.y, rect.width, rect.height);
  return path;
}

function columnDefsToColumnStates(columnDefs: ColumnDef[]) {
  const columnStates = [] as ColumnState[];
  for (const { width, ...rest } of columnDefs) {
    const _width = width ?? DEFAULT_COLUMN_WIDTH;
    columnStates.push({...rest, width: _width });
  }
  return columnStates;
}

function createVector(): Vector;
function createVector(partial: Partial<Vector> | undefined): Vector;
function createVector(x: number, y: number): Vector;
function createVector(...args: any[]): Vector {
  if (args.length === 0) {
    return { x: 0, y: 0 };
  } else if (args.length === 1) {
    return { x: 0, y: 0, ...args[0] };
  } else {
    return { x: args[0], y: args[1] };
  }
}

function createFontSpecifier(fontFamily: string, fontSize: string, fontStyle: string) {
  return [fontStyle, fontSize, fontFamily].join(" ");
}

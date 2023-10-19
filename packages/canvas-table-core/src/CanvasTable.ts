import * as UI from "./ui";
import { defaultTheme } from "./default-theme";
import {
  shallowMerge,
  scale,
  clamp,
  isNumber,
  createVector,
  pathFromRect,
  createFontSpecifier
} from "./utils";
import {
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MIN_THUMB_LENGTH
} from "./constants";
import {
  CreateCanvasTableParams,
  SetCanvasTableParams,
  ColumnDef,
  ColumnState,
  DataRow,
  DataRowValue,
  Theme,
  Rect,
  Vector,
  Layout,
  Viewport,
  UiContext
} from "./types";

export class CanvasTable {
  ui: UiContext;

  rafId: number;

  columnStates: ColumnState[];
  dataRows: DataRow[];
  theme: Theme;

  scrollPos: Vector;

  selectedRowId: DataRowValue | null;
  onSelect?: (id: DataRowValue, dataRow: DataRow) => void;

  constructor(params: CreateCanvasTableParams) {
    const { columnDefs, dataRows,  container, size, onSelect } = params;

    this.ui = UI.create({ container: container, size: size });

    this.columnStates = CanvasTable.columnDefsToColumnStates(columnDefs);
    this.dataRows = dataRows;
    this.theme = shallowMerge({}, defaultTheme, params.theme);
    this.scrollPos = { x: 0, y: 0 };
    this.selectedRowId = null;
    this.onSelect = onSelect;

    this.rafId = requestAnimationFrame(() => this.update());
  }

  set(params: Partial<SetCanvasTableParams>) {
    if (params.size) {
      UI.setCanvasSize(this.ui, params.size);
    }

    if (params.theme) {
      this.theme = shallowMerge({}, defaultTheme, params.theme);
    }
  }

  cleanup() {
    UI.removeDocumentEventListeners(this.ui);
    cancelAnimationFrame(this.rafId);
  }

  update() {
    UI.beginFrame(this.ui);

    const canvasSize = UI.getCanvasSize(this.ui);

    let layout = this.reflow();
    let viewport = this.calculateViewport(layout);

    if (this.theme.tableBackgroundColor) {
      UI.submitDraw(this.ui, {
        type: "rect",
        x: 0,
        y: 0,
        width: canvasSize.width,
        height: canvasSize.height,
        color: this.theme.tableBackgroundColor
      });
    }

    if (this.theme.bodyBackgroundColor) {
      UI.submitDraw(this.ui, {
        type: "rect",
        color: this.theme.bodyBackgroundColor,
        ...layout.bodyRect
      });
    }

    if (this.theme.headerBackgroundColor) {
      UI.submitDraw(this.ui, {
        type: "rect",
        color: this.theme.headerBackgroundColor,
        ...layout.headerRect
      });
    }

    for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
      const columnEndPosition = this.getColumnEndPosition(viewport, columnIndex);
      const rect = this.calculateColumnResizerRect(this.theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

      if (UI.isMouseInRect(this.ui, rect)) {
        UI.setAsHot(this.ui, "column-resizer", columnIndex);

        if (UI.isMousePressed(this.ui, UI.MOUSE_BUTTONS.PRIMARY)) {
          UI.setAsActive(this.ui, "column-resizer", columnIndex);

          const dragAnchorPosition = createVector(columnEndPosition, rect.y);
          this.ui.dragAnchorPosition = dragAnchorPosition;
        }

        break;
      } else {
        UI.unsetAsHot(this.ui, "column-resizer", columnIndex);
      }
    }

    if (UI.isActive(this.ui, "column-resizer")) {
      const id = this.ui.active!;
      const columnIndex = id.index!;

      const columnState = this.columnStates[columnIndex];
      const columnPos = viewport.columnPositions.get(columnIndex)!;

      const calculatedColumnWidth = this.ui.dragAnchorPosition.x + this.ui.dragDistance.x - columnPos;
      const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
      columnState.width = columnWidth;

      layout = this.reflow();

      this.scrollPos.x = Math.min(this.scrollPos.x, layout.maxScrollX);
      this.scrollPos.y = Math.min(this.scrollPos.y, layout.maxScrollY);

      viewport = this.calculateViewport(layout);
    }

    if (UI.isActive(this.ui, "column-resizer") || UI.isHot(this.ui, "column-resizer")) {
      const id = this.ui.active ?? this.ui.hot!;
      const columnIndex = id.index!;

      const columnEndPosition = this.getColumnEndPosition(viewport, columnIndex);
      const rect = this.calculateColumnResizerRect(this.theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

      const clipRegion = pathFromRect(layout.headerRect);

      UI.submitDraw(this.ui, {
        type: "rect",
        ...rect,
        color: this.theme.columnResizerColor,
        sortOrder: 2,
        clipRegion
      });
    }

    if (layout.overflowX) {
      if (this.theme.scrollbarTrackColor) {
        UI.submitDraw(this.ui, {
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...layout.hsbRect
        });
      }

      this.doHorizontalScrollbarThumb(layout);
    }

    if (layout.overflowY) {
      if (this.theme.scrollbarTrackColor) {
        UI.submitDraw(this.ui, {
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...layout.vsbRect
        });
      }

      this.doVerticalScrolbarThumb(layout);
    }

    if (UI.isMouseInRect(this.ui, layout.bodyRect)) {
      for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
        const rect = this.calculateRowRect(layout, viewport, rowIndex);

        if (UI.isMouseInRect(this.ui, rect)) {
          UI.setAsHot(this.ui, "row-hover", rowIndex);

          if (UI.isMousePressed(this.ui, UI.MOUSE_BUTTONS.PRIMARY)) {
            const dataRow = this.dataRows[rowIndex];
            this.selectedRowId = dataRow.id;

            if (this.onSelect) {
              this.onSelect(dataRow.id, dataRow);
            }
          }

          break;
        }
      }
    } else {
      UI.unsetAsHot(this.ui, "row-hover");
    }

    if (UI.isHot(this.ui, "row-hover") && this.theme.hoveredRowColor) {
      const id = this.ui.hot!;
      const rowIndex = id.index!;

      const rect = this.calculateRowRect(layout, viewport, rowIndex);

      const clipRegion = pathFromRect(layout.bodyRect);

      UI.submitDraw(this.ui, {
        type: "rect",
        color: this.theme.hoveredRowColor,
        clipRegion: clipRegion,
        ...rect,
      });
    }

    for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
      const dataRow = this.dataRows[rowIndex];
      if (dataRow.id === this.selectedRowId) {
        const rect = this.calculateRowRect(layout, viewport, rowIndex);

        const clipRegion = pathFromRect(layout.bodyRect);

        UI.submitDraw(this.ui, {
          type: "rect",
          color: this.theme.selectedRowColor,
          clipRegion: clipRegion,
          ...rect
        });
      }
    }

    // Draw outer canvas border
    UI.submitDraw(this.ui, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: 0,
      length: canvasSize.width,
      color: this.theme.tableBorderColor
    });

    UI.submitDraw(this.ui, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: canvasSize.height - 1,
      length: canvasSize.width,
      color: this.theme.tableBorderColor
    });

    UI.submitDraw(this.ui, {
      type: "line",
      orientation: "vertical",
      x: 0,
      y: 0,
      length: canvasSize.height,
      color: this.theme.tableBorderColor
    });

    UI.submitDraw(this.ui, {
      type: "line",
      orientation: "vertical",
      x: canvasSize.width - 1,
      y: 0,
      length: canvasSize.height,
      color: this.theme.tableBorderColor
    });

    // Draw header bottom border
    UI.submitDraw(this.ui, {
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: this.theme.rowHeight,
      length: canvasSize.width,
      color: this.theme.tableBorderColor
    });

    // If horizontal scrollbar is visible, draw its border, otherwise,
    // draw table content right border
    if (layout.overflowX) {
      UI.submitDraw(this.ui, {
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: layout.hsbRect.y - 1,
        length: canvasSize.width,
        color: this.theme.tableBorderColor
      });
    } else {
      UI.submitDraw(this.ui, {
        type: "line",
        orientation: "vertical",
        x: layout.gridWidth,
        y: 0,
        length: layout.gridHeight,
        color: this.theme.tableBorderColor
      });
    }

    // If vertical scrollbar is visible, draw its border, otherwise,
    // draw table content bottom border
    if (layout.overflowY) {
      UI.submitDraw(this.ui, {
        type: "line",
        orientation: "vertical",
        x: layout.vsbRect.x - 1,
        y: 0,
        length: canvasSize.height,
        color: this.theme.tableBorderColor
      });
    } else {
      UI.submitDraw(this.ui, {
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: layout.gridHeight,
        length: layout.gridWidth,
        color: this.theme.tableBorderColor
      });
    }

    // Draw grid horizontal lines
    for (let rowIndex = viewport.rowStart + 1; rowIndex < viewport.rowEnd; rowIndex++) {
      const rowPos = viewport.rowPositions.get(rowIndex)!;

      UI.submitDraw(this.ui, {
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: rowPos,
        length: layout.gridWidth,
        color: this.theme.tableBorderColor
      });
    }

    // Draw grid vertical lines
    for (let columnIndex = viewport.columnStart + 1; columnIndex < viewport.columnEnd; columnIndex++) {
      const columnPos = viewport.columnPositions.get(columnIndex)!;

      UI.submitDraw(this.ui, {
        type: "line",
        orientation: "vertical",
        x: columnPos,
        y: 0,
        length: layout.gridHeight,
        color: this.theme.tableBorderColor
      });
    }

  {
      const fontStyle = this.theme.headerFontStyle ?? this.theme.fontStyle;
      const font = createFontSpecifier(this.theme.fontFamily, this.theme.fontSize, fontStyle);

      const fontColor = this.theme.headerFontColor ?? this.theme.fontColor;

      const clipRegion = pathFromRect(layout.headerRect);

      for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
        const columnState = this.columnStates[columnIndex];

        const columnPos = viewport.columnPositions.get(columnIndex)!;

        const x = columnPos + this.theme.cellPadding;
        const y = this.theme.rowHeight / 2;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;
        const text = columnState.title;

        UI.submitDraw(this.ui, {
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
      const fontStyle = this.theme.bodyFontStyle ?? this.theme.fontStyle;
      const font = createFontSpecifier(this.theme.fontFamily, this.theme.fontSize, fontStyle);

      const fontColor = this.theme.bodyFontColor ?? this.theme.fontColor;

      const clipRegion = pathFromRect(layout.bodyRect);

      for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
        const columnState = this.columnStates[columnIndex];

        const columnPos = viewport.columnPositions.get(columnIndex)!;

        const x = columnPos + this.theme.cellPadding;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;

        for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
          const dataRow = this.dataRows[rowIndex];

          const rowPos = viewport.rowPositions.get(rowIndex)!;

          const y = rowPos + this.theme.rowHeight / 2;

          const value = dataRow[columnState.field];
          const text = isNumber(value) ? value.toString() : value as string;

          UI.submitDraw(this.ui, {
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

    UI.endFrame(this.ui);
    this.rafId = requestAnimationFrame(() => this.update());
  }

  reflow(): Layout {
    const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = this.theme;

    let contentWidth = 0;
    for (const { width } of this.columnStates) {
      contentWidth += width;
    }
    const contentHeight = this.dataRows.length * rowHeight;

    const canvasSize = UI.getCanvasSize(this.ui);
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

  calculateViewport(layout: Layout): Viewport {
    let columnStart = 0;
    let columnPos = 0;
    const columnPositions = new Map();

    for (; columnStart < this.columnStates.length; columnStart++) {
      const columnState = this.columnStates[columnStart];
      const nextColumnPos = columnPos + columnState.width;
      if (nextColumnPos > this.scrollPos.x) {
        break;
      }

      columnPositions.set(columnStart, columnPos - this.scrollPos.x);

      columnPos = nextColumnPos;
    }

    const scrollRight = this.scrollPos.x + layout.bodyRect.width;

    let columnEnd = columnStart;
    for (; columnEnd < this.columnStates.length; columnEnd++) {
      if (columnPos >= scrollRight) {
        break;
      }

      columnPositions.set(columnEnd, columnPos - this.scrollPos.x);

      const columnState = this.columnStates[columnEnd];
      columnPos += columnState.width;
    }

    const rowStart = Math.floor(this.scrollPos.y / this.theme.rowHeight);

    const scrollBottom = this.scrollPos.y + layout.bodyRect.height;
    const rowEnd = Math.min(Math.ceil(scrollBottom / this.theme.rowHeight), this.dataRows.length);

    const rowPositions = new Map();
    for (let i = rowStart; i < rowEnd; i++) {
      const rowPosition = i * this.theme.rowHeight + this.theme.rowHeight - this.scrollPos.y;
      rowPositions.set(i, rowPosition);
    }

    const tableEndPosition = layout.scrollWidth - this.scrollPos.x;

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

  doHorizontalScrollbarThumb(layout: Layout) {
    const { scrollWidth, maxScrollX, hsbTrackRect } = layout;

    const hsbThumbWidth = Math.max((layout.bodyRect.width / scrollWidth) * hsbTrackRect.width, MIN_THUMB_LENGTH);
    const hsbThumbHeight = hsbTrackRect.height;

    const hsbThumbMinX = hsbTrackRect.x;
    const hsbThumbMaxX = hsbTrackRect.x + hsbTrackRect.width - hsbThumbWidth;

    let hsbThumbX = scale(this.scrollPos.x, 0, maxScrollX, hsbThumbMinX, hsbThumbMaxX);
    const hsbThumbY = hsbTrackRect.y;

    let dragging = false;

    if (UI.isActive(this.ui, "hsb-thumb")) {
      dragging = true;
    } else if (UI.isHot(this.ui, "hsb-thumb")) {
      if (UI.isMousePressed(this.ui, UI.MOUSE_BUTTONS.PRIMARY)) {
        UI.setAsActive(this.ui, "hsb-thumb");

        const dragAnchorPosition = createVector(hsbThumbX, hsbThumbY);
        this.ui.dragAnchorPosition = dragAnchorPosition;
      }
    }

    if (dragging) {
      hsbThumbX = clamp(this.ui.dragAnchorPosition.x + this.ui.dragDistance.x, hsbThumbMinX, hsbThumbMaxX);
      const newScrollX = Math.round(scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX));
      this.scrollPos.x = newScrollX;
    }

    const hsbThumbRect = {
      x: hsbThumbX,
      y: hsbThumbY,
      width:  hsbThumbWidth,
      height: hsbThumbHeight,
    };

    const inside = UI.isMouseInRect(this.ui, hsbThumbRect);
    if (inside) {
      UI.setAsHot(this.ui, "hsb-thumb");
    } else {
      UI.unsetAsHot(this.ui, "hsb-thumb");
    }

    let color: string;
    if (UI.isActive(this.ui, "hsb-thumb")) {
      color = this.theme.scrollbarThumbPressedColor ?? this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else if (UI.isHot(this.ui, "hsb-thumb")) {
      color = this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else {
      color = this.theme.scrollbarThumbColor;
    }

    UI.submitDraw(this.ui, {
      type: "rect",
      color,
      sortOrder: 2,
      ...hsbThumbRect
    });
  }

  doVerticalScrolbarThumb(layout: Layout) {
    const { scrollHeight, maxScrollY, vsbTrackRect } = layout;

    const vsbThumbHeight = Math.max((layout.bodyRect.height / scrollHeight) * vsbTrackRect.height, MIN_THUMB_LENGTH);
    const vsbThumbWidth = vsbTrackRect.width;

    const vsbThumbMinY = vsbTrackRect.y;
    const vsbThumbMaxY = vsbTrackRect.y + vsbTrackRect.height - vsbThumbHeight;

    let vsbThumbY = scale(this.scrollPos.y, 0, maxScrollY, vsbThumbMinY, vsbThumbMaxY);
    const vsbThumbX = vsbTrackRect.x;

    let dragging = false;

    if (UI.isActive(this.ui, "vsb-thumb")) {
      dragging = true;
    } else if (UI.isHot(this.ui, "vsb-thumb")) {
      if (UI.isMousePressed(this.ui, UI.MOUSE_BUTTONS.PRIMARY)) {
        UI.setAsActive(this.ui, "vsb-thumb");

        const dragAnchorPosition = createVector(vsbThumbX, vsbThumbY);
        this.ui.dragAnchorPosition = dragAnchorPosition;
      }
    }

    if (dragging) {
      vsbThumbY = clamp(this.ui.dragAnchorPosition.y + this.ui.dragDistance.y, vsbThumbMinY, vsbThumbMaxY);
      const newScrollY = Math.round(scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY));
      this.scrollPos.y = newScrollY;
    }

    const vsbThumbRect = {
      x: vsbThumbX,
      y: vsbThumbY,
      width: vsbThumbWidth,
      height: vsbThumbHeight
    };

    const inside = UI.isMouseInRect(this.ui, vsbThumbRect);
    if (inside) {
      UI.setAsHot(this.ui, "vsb-thumb");
    } else {
      UI.unsetAsHot(this.ui, "vsb-thumb");
    }

    let color: string;
    if (UI.isActive(this.ui, "vsb-thumb")) {
      color = this.theme.scrollbarThumbPressedColor ?? this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else if (UI.isHot(this.ui, "vsb-thumb")) {
      color = this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else {
      color = this.theme.scrollbarThumbColor;
    }

    UI.submitDraw(this.ui, {
      type: "rect",
      color,
      sortOrder: 2,
      ...vsbThumbRect
    });
  }

  getColumnEndPosition(viewport: Viewport, columnIndex: number) {
    const columnState = this.columnStates[columnIndex];
    const columnPosStart = viewport.columnPositions.get(columnIndex)!;
    const columnPosEnd = columnPosStart + columnState.width;

    return columnPosEnd;
  }

  calculateColumnResizerRect(rowHeight: number, tableEndPosition: number, columnEndPosition: number) {
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

  calculateRowRect(layout: Layout, viewport: Viewport, rowIndex: number) {
    return {
      x: 0,
      y: viewport.rowPositions.get(rowIndex)!,
      width: layout.gridWidth,
      height: this.theme.rowHeight
    };
  }

  pathFromRect(rect: Rect) {
    const path = new Path2D();
    path.rect(rect.x, rect.y, rect.width, rect.height);
    return path;
  }

  static columnDefsToColumnStates(columnDefs: ColumnDef[]) {
    const columnStates = [] as ColumnState[];
    for (const { width, ...rest } of columnDefs) {
      const _width = width ?? DEFAULT_COLUMN_WIDTH;
      columnStates.push({...rest, width: _width });
    }
    return columnStates;
  }
}

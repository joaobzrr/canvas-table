import { Stage } from "./lib/Stage";
import { Renderer } from "./lib/Renderer";
import { UiContext } from "./lib/UiContext";
import { defaultTheme } from "./default-theme";
import {
  shallowMerge,
  scale,
  clamp,
  isNumber,
  createVector,
  pathFromRect,
  createFontSpecifier,
  getFontMetrics
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
} from "./types";

export class CanvasTable {
  stage: Stage;
  renderer: Renderer;
  ui: UiContext;

  columnStates: ColumnState[];
  dataRows: DataRow[];
  theme: Theme;

  scrollPos: Vector;
  selectedRowId: DataRowValue | null;

  onSelect?: (id: DataRowValue, dataRow: DataRow) => void;

  constructor(params: CreateCanvasTableParams) {
    const { columnDefs, dataRows,  container, size, onSelect } = params;

    this.stage = new Stage(container, size);
    this.stage.setUpdateFunction(this.update.bind(this));

    this.renderer = new Renderer();
    this.ui = new UiContext();

    this.columnStates = CanvasTable.columnDefsToColumnStates(columnDefs);
    this.dataRows = dataRows;
    this.theme = shallowMerge({}, defaultTheme, params.theme);
    this.scrollPos = { x: 0, y: 0 };
    this.selectedRowId = null;
    this.onSelect = onSelect;

    this.stage.run();
  }

  set(params: Partial<SetCanvasTableParams>) {
    if (params.columnDefs) {
      this.columnStates = CanvasTable.columnDefsToColumnStates(params.columnDefs);
    }

    if (params.dataRows) {
      this.dataRows = params.dataRows;
    }

    if (params.size) {
      this.stage.setSize(params.size);
    }

    if (params.theme) {
      this.theme = shallowMerge({}, defaultTheme, params.theme);
    }
  }

  cleanup() {
    this.stage.cleanup();
  }

  update() {
    const ctx = this.stage.getContext();
    const stageSize = this.stage.getSize();

    if (this.stage.isMouseReleased(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.ui.setAsActive(null);
    }

    let layout = this.reflow();

    {
      const scrollPos = createVector(this.scrollPos);
      if (this.ui.active === null) {
        scrollPos.x += this.stage.scrollAmount.x;
        scrollPos.y += this.stage.scrollAmount.y;
      }

      this.scrollPos.x = clamp(scrollPos.x, 0, layout.maxScrollX);
      this.scrollPos.y = clamp(scrollPos.y, 0, layout.maxScrollY);
    }

    let viewport = this.calculateViewport(layout);

    if (this.theme.tableBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        x: 0,
        y: 0,
        width: stageSize.width,
        height: stageSize.height,
        color: this.theme.tableBackgroundColor
      });
    }

    if (this.theme.bodyBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.bodyBackgroundColor,
        ...layout.bodyRect
      });
    }

    if (this.theme.headerBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.headerBackgroundColor,
        ...layout.headerRect
      });
    }

    for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
      const columnEndPosition = this.getColumnEndPosition(viewport, columnIndex);
      const rect = this.calculateColumnResizerRect(this.theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

      if (this.stage.isMouseInRect(rect)) {
        this.ui.setAsHot("column-resizer", columnIndex);

        if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
          this.ui.setAsActive("column-resizer", columnIndex);

          const dragAnchorPosition = createVector(columnEndPosition, rect.y);
          this.stage.dragAnchorPosition = dragAnchorPosition;
        }

        break;
      } else {
        this.ui.unsetAsHot("column-resizer", columnIndex);
      }
    }

    if (this.ui.isActive("column-resizer")) {
      const columnIndex = this.ui.getActiveIndex()!;

      const columnState = this.columnStates[columnIndex];
      const columnPos = viewport.columnPositions.get(columnIndex)!;

      const calculatedColumnWidth = this.stage.dragAnchorPosition.x + this.stage.dragDistance.x - columnPos;
      const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
      columnState.width = columnWidth;

      layout = this.reflow();

      this.scrollPos.x = Math.min(this.scrollPos.x, layout.maxScrollX);
      this.scrollPos.y = Math.min(this.scrollPos.y, layout.maxScrollY);

      viewport = this.calculateViewport(layout);
    }

    if (this.ui.isActive("column-resizer") || this.ui.isHot("column-resizer")) {
      const columnIndex = this.ui.getActiveIndex() ?? this.ui.getHotIndex()!;

      const columnEndPosition = this.getColumnEndPosition(viewport, columnIndex);
      const rect = this.calculateColumnResizerRect(this.theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

      const clipRegion = pathFromRect(layout.headerRect);

      this.renderer.submit({
        type: "rect",
        ...rect,
        color: this.theme.columnResizerColor,
        sortOrder: 2,
        clipRegion
      });
    }

    if (layout.overflowX) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...layout.hsbRect
        });
      }

      this.doHorizontalScrollbarThumb(layout);
    }

    if (layout.overflowY) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...layout.vsbRect
        });
      }

      this.doVerticalScrolbarThumb(layout);
    }

    if (this.stage.isMouseInRect(layout.bodyRect)) {
      for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
        const rect = this.calculateRowRect(layout, viewport, rowIndex);

        if (this.stage.isMouseInRect(rect)) {
          this.ui.setAsHot("row-hover", rowIndex);

          if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
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
      this.ui.unsetAsHot("row-hover");
    }

    if (this.ui.isHot("row-hover") && this.theme.hoveredRowColor) {
      const id = this.ui.hot!;
      const rowIndex = id.index!;

      const rect = this.calculateRowRect(layout, viewport, rowIndex);

      const clipRegion = pathFromRect(layout.bodyRect);

      this.renderer.submit({
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

        this.renderer.submit({
          type: "rect",
          color: this.theme.selectedRowColor,
          clipRegion: clipRegion,
          ...rect
        });
      }
    }

    // Draw outer canvas border
    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: 0,
      length: stageSize.width,
      color: this.theme.tableBorderColor
    });

    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: stageSize.height - 1,
      length: stageSize.width,
      color: this.theme.tableBorderColor
    });

    this.renderer.submit({
      type: "line",
      orientation: "vertical",
      x: 0,
      y: 0,
      length: stageSize.height,
      color: this.theme.tableBorderColor
    });

    this.renderer.submit({
      type: "line",
      orientation: "vertical",
      x: stageSize.width - 1,
      y: 0,
      length: stageSize.height,
      color: this.theme.tableBorderColor
    });

    // Draw header bottom border
    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: this.theme.rowHeight,
      length: stageSize.width,
      color: this.theme.tableBorderColor
    });

    // If horizontal scrollbar is visible, draw its border, otherwise,
    // draw table content right border
    if (layout.overflowX) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: layout.hsbRect.y - 1,
        length: stageSize.width,
        color: this.theme.tableBorderColor
      });
    } else {
      this.renderer.submit({
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
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: layout.vsbRect.x - 1,
        y: 0,
        length: stageSize.height,
        color: this.theme.tableBorderColor
      });
    } else {
      this.renderer.submit({
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

      this.renderer.submit({
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

      this.renderer.submit({
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

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBounginxBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const fontColor = this.theme.headerFontColor ?? this.theme.fontColor;

      const clipRegion = pathFromRect(layout.headerRect);

      for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
        const columnState = this.columnStates[columnIndex];

        const columnPos = viewport.columnPositions.get(columnIndex)!;

        const x = columnPos + this.theme.cellPadding;
        const y = this.theme.rowHeight / 2 + halfFontBounginxBoxAscent;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;
        const text = columnState.title;

        this.renderer.submit({
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

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBoundingBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

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

          const y = rowPos + this.theme.rowHeight / 2 + halfFontBoundingBoxAscent;

          const value = dataRow[columnState.field];
          const text = isNumber(value) ? value.toString() : value as string;

          this.renderer.submit({
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

    this.renderer.render(ctx, stageSize);
  }

  reflow(): Layout {
    const { rowHeight, scrollbarThickness, scrollbarTrackMargin } = this.theme;

    let contentWidth = 0;
    for (const { width } of this.columnStates) {
      contentWidth += width;
    }
    const contentHeight = this.dataRows.length * rowHeight;

    const canvasSize = this.stage.getSize();
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

    if (this.ui.isActive("hsb-thumb")) {
      dragging = true;
    } else if (this.ui.isHot("hsb-thumb")) {
      if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        this.ui.setAsActive("hsb-thumb");

        const dragAnchorPosition = createVector(hsbThumbX, hsbThumbY);
        this.stage.dragAnchorPosition = dragAnchorPosition;
      }
    }

    if (dragging) {
      hsbThumbX = clamp(this.stage.dragAnchorPosition.x + this.stage.dragDistance.x, hsbThumbMinX, hsbThumbMaxX);
      const newScrollX = Math.round(scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX));
      this.scrollPos.x = newScrollX;
    }

    const hsbThumbRect = {
      x: hsbThumbX,
      y: hsbThumbY,
      width:  hsbThumbWidth,
      height: hsbThumbHeight,
    };

    const inside = this.stage.isMouseInRect(hsbThumbRect);
    if (inside) {
      this.ui.setAsHot("hsb-thumb");
    } else {
      this.ui.unsetAsHot("hsb-thumb");
    }

    let color: string;
    if (this.ui.isActive("hsb-thumb")) {
      color = this.theme.scrollbarThumbPressedColor ?? this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else if (this.ui.isHot("hsb-thumb")) {
      color = this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else {
      color = this.theme.scrollbarThumbColor;
    }

    this.renderer.submit({
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

    if (this.ui.isActive("vsb-thumb")) {
      dragging = true;
    } else if (this.ui.isHot("vsb-thumb")) {
      if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        this.ui.setAsActive("vsb-thumb");

        const dragAnchorPosition = createVector(vsbThumbX, vsbThumbY);
        this.stage.dragAnchorPosition = dragAnchorPosition;
      }
    }

    if (dragging) {
      vsbThumbY = clamp(this.stage.dragAnchorPosition.y + this.stage.dragDistance.y, vsbThumbMinY, vsbThumbMaxY);
      const newScrollY = Math.round(scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY));
      this.scrollPos.y = newScrollY;
    }

    const vsbThumbRect = {
      x: vsbThumbX,
      y: vsbThumbY,
      width: vsbThumbWidth,
      height: vsbThumbHeight
    };

    const inside = this.stage.isMouseInRect(vsbThumbRect);
    if (inside) {
      this.ui.setAsHot("vsb-thumb");
    } else {
      this.ui.unsetAsHot("vsb-thumb");
    }

    let color: string;
    if (this.ui.isActive("vsb-thumb")) {
      color = this.theme.scrollbarThumbPressedColor ?? this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else if (this.ui.isHot("vsb-thumb")) {
      color = this.theme.scrollbarThumbHoverColor ?? this.theme.scrollbarThumbColor;
    } else {
      color = this.theme.scrollbarThumbColor;
    }

    this.renderer.submit({
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

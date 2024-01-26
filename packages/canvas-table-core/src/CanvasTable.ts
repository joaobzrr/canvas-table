import { Renderer } from "./Renderer";
import { GuiContext } from "./GuiContext";
import { defaultTheme } from "./defaultTheme";
import { clamp, lerp, createFontSpecifier, isNumber, shallowMerge, isEmpty } from "./utils";
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MIN_THUMB_LENGTH,
  MOUSE_BUTTONS
} from "./constants";
import {
  CanvasTableProps,
  CanvasTableParams,
  ColumnDef,
  DataRow,
  DataRowId,
  PropValue
} from "./types";

export class CanvasTable {
  renderer: Renderer;
  gui: GuiContext;

  // State stuff
  props: CanvasTableProps;
  batchedProps: Partial<CanvasTableProps>[] = [];

  tableWidth = 1;
  tableHeight = 1;
  tableAreaX = 0;
  tableAreaY = 0;
  tableAreaWidth = 1;
  tableAreaHeight = 1;
  bodyAreaX = 0;
  bodyAreaY = 0;
  bodyAreaWidth = 1;
  bodyAreaHeight = 1;
  headerAreaX = 0;
  headerAreaY = 0;
  headerAreaWidth = 1;
  headerAreaHeight = 1;
  bodyVisibleWidth = 1;
  bodyVisibleHeight = 1;
  scrollX = 0;
  scrollY = 0;
  scrollWidth = 1;
  scrollHeight = 1;
  scrollWidthMinCapped = 1;
  scrollHeightMinCapped = 1;
  maxScrollX = 0;
  maxScrollY = 0;
  hsbX = 0;
  hsbY = 0;
  hsbWidth = 1;
  hsbHeight = 1;
  hsbTrackX = 0;
  hsbTrackY = 0;
  hsbTrackWidth = 1;
  hsbTrackHeight = 1;
  hsbThumbX = 0;
  hsbThumbY = 0;
  hsbThumbWidth = 1;
  hsbThumbHeight = 1;
  hsbThumbMinX = 0;
  hsbThumbMaxX = 0;
  vsbX = 0;
  vsbY = 0;
  vsbWidth = 1;
  vsbHeight = 1;
  vsbTrackX = 0;
  vsbTrackY = 0;
  vsbTrackWidth = 1;
  vsbTrackHeight = 1;
  vsbThumbX = 0;
  vsbThumbY = 0;
  vsbThumbWidth = 1;
  vsbThumbHeight = 1;
  vsbThumbMinY = 0;
  vsbThumbMaxY = 0;
  overflowX = false;
  overflowY = false;
  columnStart = 0;
  columnEnd = 0;
  rowStart = 0;
  rowEnd = 0;
  mouseRow = -1;
  columnWidths: number[];
  canonicalColumnPositions: number[] = [];
  selectedRowId: DataRowId | null = null;

  constructor(params: CanvasTableParams) {
    const { container, columnDefs, ...partialProps } = params;

    this.gui = new GuiContext(container);
    this.gui.updateFunction = this.update.bind(this);

    this.renderer = new Renderer({ canvas: this.gui.canvas, ctx: this.gui.ctx });

    const theme = params.theme ?? defaultTheme;
    const selectId = params.selectId ?? ((row: DataRow) => row.id as DataRowId);
    const selectProp = params.selectProp ?? ((row: DataRow, columnDef: ColumnDef) => row[columnDef.key] as PropValue);
    this.props = {
      ...partialProps,
      columnDefs,
      theme,
      selectId,
      selectProp
    };

    this.columnWidths = CanvasTable.calculateColumnWidths(columnDefs);

    this.gui.startAnimation();
  }

  static calculateColumnWidths(columnDefs: ColumnDef[]) {
    const column_widths = [] as number[];
    for (const { width } of columnDefs) {
      column_widths.push(width ?? DEFAULT_COLUMN_WIDTH);
    }
    return column_widths;
  }

  config(props: Partial<CanvasTableProps>) {
    this.batchedProps.push(props);
  }

  destroy() {
    this.gui.destroy();
  }

  update() {
    const { theme } = this.props;

    let tableResized = false;
    if (this.tableWidth !== this.gui.canvas.width || this.tableHeight !== this.gui.canvas.height) {
      this.tableWidth = this.gui.canvas.width;
      this.tableHeight = this.gui.canvas.height;
      tableResized = true;
    }

    let dataChanged = false;
    {
      const newProps = {} as Partial<CanvasTableProps>;
      while (this.batchedProps.length > 0) {
        shallowMerge(newProps, this.batchedProps.shift());
      }

      if (!isEmpty(newProps)) {
        if (newProps.columnDefs && !Object.is(newProps.columnDefs, this.props.columnDefs)) {
          this.columnWidths = CanvasTable.calculateColumnWidths(newProps.columnDefs);
          dataChanged = true;
        }

        if (newProps.dataRows && !Object.is(newProps.dataRows, this.props.dataRows)) {
          dataChanged = true;
        }

        if (newProps.theme && !Object.is(newProps.theme, this.props.theme)) {
          dataChanged = true;
        }

        shallowMerge(this.props, newProps);
      }
    }

    if (tableResized || dataChanged) {
      this.refreshLayout();
    }

    let scrollPosChanged = false;
    {
      let newScrollX = this.scrollX;
      let newScrollY = this.scrollY;
      if (this.gui.isNoWidgetActive()) {
        newScrollX += this.gui.scrollAmountX;
        newScrollY += this.gui.scrollAmountY;
      }
      newScrollX = clamp(newScrollX, 0, this.maxScrollX);
      newScrollY = clamp(newScrollY, 0, this.maxScrollY);

      if (newScrollX !== this.scrollX || newScrollY !== this.scrollY) {
        this.scrollX = newScrollX;
        this.scrollY = newScrollY;

        scrollPosChanged = true;
      }
    }

    if (tableResized || dataChanged || scrollPosChanged) {
      this.refreshViewport();

      this.hsbThumbX = this.calculateHorizontalScrollbarThumbX(this.scrollX);
      this.vsbThumbY = this.calculateVerticalScrollbarThumbY(this.scrollY);
    }

    if (this.gui.isMouseInRect(this.bodyAreaX, this.bodyAreaY, this.bodyVisibleWidth, this.bodyVisibleHeight)) {
      this.mouseRow = Math.floor((this.screenToScrollY(this.gui.currMouseY) - theme.rowHeight) / theme.rowHeight);
    } else {
      this.mouseRow = -1;
    }

    // Do column resizers
    for (const columnIndex of this.tableColumnRange()) {
      const id = `column-resizer-${columnIndex}`;

      let resizerScrollX = this.calculateResizerScrollX(columnIndex);
      if (this.gui.isWidgetActive(id)) {
        if (this.gui.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
          this.gui.setActiveWidget(null);
        } else {
          const columnScrollLeft = this.calculateColumnScrollX(columnIndex);
          const columnScrollRight = this.gui.dragAnchorX + this.gui.dragDistanceX;
          const columnWidth = Math.max(columnScrollRight - columnScrollLeft, MIN_COLUMN_WIDTH);
          this.resizeTableColumn(columnIndex, columnWidth);

          resizerScrollX = this.calculateResizerScrollX(columnIndex);
        }
      } else if (this.gui.isWidgetHot(id)) {
        if (this.gui.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
          this.gui.setActiveWidget(id);
          this.gui.dragAnchorX = resizerScrollX + COLUMN_RESIZER_LEFT_WIDTH;
        }
      }

      const resizerX = this.scrollToScreenX(resizerScrollX);
      const resizerY = BORDER_WIDTH;
      const resizerWidth = COLUMN_RESIZER_WIDTH;
      const resizerHeight = theme.rowHeight - BORDER_WIDTH;

      const inside = this.gui.isMouseInRect(resizerX, resizerY, resizerWidth, resizerHeight);
      if (inside) {
        this.gui.setHotWidget(id);
      } else if (this.gui.isWidgetHot(id)) {
        this.gui.setHotWidget(null);
      }

      if (this.gui.isWidgetActive(id) || this.gui.isWidgetHot(id)) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: resizerX,
          y: resizerY,
          width: resizerWidth,
          height: resizerHeight,
          fillColor: theme.columnResizerColor,
          clipRegion: this.makeHeaderAreaClipRegion(),
          sortOrder: 3
        });
        break;
      }
    }

    // Do horizontal scrollbar
    if (this.overflowX) {
      if (theme.scrollbarTrackColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.hsbX,
          y: this.hsbY,
          width: this.hsbWidth,
          height: this.hsbHeight,
          fillColor: theme.scrollbarTrackColor,
          sortOrder: 2
        });
      }

      const id = "horizontal-scrollbar-thumb";
      if (this.gui.isWidgetActive(id)) {
        if (this.gui.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
          this.gui.setActiveWidget(null);
        } else {
          this.hsbThumbX = clamp(this.gui.dragAnchorX + this.gui.dragDistanceX, this.hsbThumbMinX, this.hsbThumbMaxX);
          this.scrollX = this.calculateScrollX(this.hsbThumbX);
          this.refreshViewport();
        }
      } else if (this.gui.isWidgetHot(id)) {
        if (this.gui.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
          this.gui.setActiveWidget(id);

          this.gui.dragAnchorX = this.hsbThumbX;
        }
      }

      const inside = this.gui.isMouseInRect(this.hsbThumbX, this.hsbThumbY, this.hsbThumbWidth, this.hsbThumbHeight);
      if (inside) {
        this.gui.setHotWidget(id);
      } else if (this.gui.isWidgetHot(id)) {
        this.gui.setHotWidget(null);
      }

      let fillColor: string | undefined;
      if (this.gui.isWidgetActive(id)) {
        fillColor = theme.scrollbarThumbPressedColor;
      } else if (this.gui.isWidgetHot(id)) {
        fillColor = theme.scrollbarThumbHoverColor;
      } else {
        fillColor = theme.scrollbarThumbColor;
      }

      if (fillColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.hsbThumbX,
          y: this.hsbThumbY,
          width: this.hsbThumbWidth,
          height: this.hsbThumbHeight,
          fillColor: fillColor,
          sortOrder: 3
        });
      }
    }

    // Do vertical scrollbar
    if (this.overflowY) {
      if (theme.scrollbarTrackColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.vsbX,
          y: this.vsbY,
          width: this.vsbWidth,
          height: this.vsbHeight,
          fillColor: theme.scrollbarTrackColor,
          sortOrder: 2
        });
      }

      const id = "vertical-scrollbar-thumb";
      if (this.gui.isWidgetActive(id)) {
        if (this.gui.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
          this.gui.setActiveWidget(null);
        } else {
          this.vsbThumbY = clamp(this.gui.dragAnchorY + this.gui.dragDistanceY, this.vsbThumbMinY, this.vsbThumbMaxY);
          this.scrollY = this.calculateScrollY(this.vsbThumbY);
          this.refreshViewport();
        }
      } else if (this.gui.isWidgetHot(id)) {
        if (this.gui.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
          this.gui.setActiveWidget(id);

          this.gui.dragAnchorY = this.vsbThumbY;
        }
      }

      const inside = this.gui.isMouseInRect(this.vsbThumbX, this.vsbThumbY, this.vsbThumbWidth, this.vsbThumbHeight);
      if (inside) {
        this.gui.setHotWidget(id);
      } else if (this.gui.isWidgetHot(id)) {
        this.gui.setHotWidget(null);
      }

      let fillColor: string | undefined;
      if (this.gui.isWidgetActive(id)) {
        fillColor = theme.scrollbarThumbPressedColor;
      } else if (this.gui.isWidgetHot(id)) {
        fillColor = theme.scrollbarThumbHoverColor;
      } else {
        fillColor = theme.scrollbarThumbColor;
      }

      if (fillColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.vsbThumbX,
          y: this.vsbThumbY,
          width: this.vsbThumbWidth,
          height: this.vsbThumbHeight,
          fillColor: fillColor,
          sortOrder: 3
        });
      }
    }

    // Draw hovered and selected rows
    if (this.mouseRow !== -1) {
      const dataRow = this.props.dataRows[this.mouseRow];
      if (this.gui.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        const dataRowId = this.props.selectId(dataRow);
        if (dataRowId !== this.selectedRowId) {
          this.selectedRowId = dataRowId;
          this.props.onSelectRow?.(dataRowId, dataRow);
        }
      }

      if (theme.hoveredRowColor && this.gui.isNoWidgetActive()) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: 0,
          y: this.calculateRowScreenY(this.mouseRow),
          width: this.bodyVisibleWidth,
          height: theme.rowHeight,
          fillColor: theme.hoveredRowColor,
          clipRegion: this.makeBodyAreaClipRegion()
        });
      }
    }

    if (this.selectedRowId !== null) {
      for (const rowIndex of this.tableRowRange()) {
        const dataRow = this.props.dataRows[rowIndex];
        const dataRowId = this.props.selectId(dataRow);
        if (this.selectedRowId == dataRowId) {
          this.renderer.pushDrawCommand({
            type: "rect",
            x: 0,
            y: this.calculateRowScreenY(rowIndex),
            width: this.bodyVisibleWidth,
            height: theme.rowHeight,
            fillColor: theme.selectedRowColor,
            clipRegion: this.makeBodyAreaClipRegion()
          });
          break;
        }
      }
    }

    if (theme.tableBackgroundColor) {
      this.renderer.pushDrawCommand({
        type: "rect",
        x: 0,
        y: 0,
        width: this.tableWidth,
        height: this.tableHeight,
        fillColor: theme.tableBackgroundColor
      });
    }

    if (theme.bodyBackgroundColor) {
      this.renderer.pushDrawCommand({
        type: "rect",
        x: this.bodyAreaX,
        y: this.bodyAreaY,
        width: this.bodyAreaWidth,
        height: this.bodyAreaHeight,
        fillColor: theme.bodyBackgroundColor
      });
    }

    if (theme.headerBackgroundColor) {
      this.renderer.pushDrawCommand({
        type: "rect",
        x: this.headerAreaX,
        y: this.headerAreaY,
        width: this.headerAreaWidth,
        height: this.headerAreaHeight,
        fillColor: theme.headerBackgroundColor
      });
    }

    // Draw top outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: 0,
      length: this.tableWidth,
      color: theme.tableBorderColor,
      sortOrder: 2
    });

    // Draw bottom outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: this.tableHeight - BORDER_WIDTH,
      length: this.tableWidth,
      color: theme.tableBorderColor,
      sortOrder: 2
    });

    // Draw left outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "vertical",
      x: 0,
      y: 0,
      length: this.tableHeight,
      color: theme.tableBorderColor,
      sortOrder: 2
    });

    // Draw right outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "vertical",
      x: this.tableWidth - BORDER_WIDTH,
      y: 0,
      length: this.tableHeight,
      color: theme.tableBorderColor,
      sortOrder: 2
    });

    const grid_width = this.bodyVisibleWidth;
    const grid_height = this.bodyVisibleHeight + theme.rowHeight;

    // Draw header bottom border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: theme.rowHeight,
      length: this.tableWidth,
      color: theme.tableBorderColor,
      sortOrder: 2
    });

    // If horizontal scrollbar is visible, draw its border, otherwise,
    // draw table content right border
    if (this.overflowX) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.hsbY - BORDER_WIDTH,
        length: this.tableWidth,
        color: theme.tableBorderColor,
        sortOrder: 2
      });
    } else {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "vertical",
        x: grid_width,
        y: 0,
        length: grid_height,
        color: theme.tableBorderColor,
        sortOrder: 2
      });
    }

    // If vertical scrollbar is visible, draw its border, otherwise,
    // draw table content bottom border
    if (this.overflowY) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "vertical",
        x: this.vsbX - BORDER_WIDTH,
        y: 0,
        length: this.tableHeight,
        color: theme.tableBorderColor,
        sortOrder: 2
      });
    } else {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: grid_height,
        length: grid_width,
        color: theme.tableBorderColor,
        sortOrder: 2
      });
    }

    // Draw grid horizontal lines
    for (const rowIndex of this.tableRowRange(1)) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.calculateRowScreenY(rowIndex),
        length: grid_width,
        color: theme.tableBorderColor,
        sortOrder: 2
      });
    }

    // Draw grid vertical lines
    for (const columnIndex of this.tableColumnRange(1)) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "vertical",
        x: this.calculateColumnScreenX(columnIndex),
        y: 0,
        length: grid_height,
        color: theme.tableBorderColor,
        sortOrder: 2
      });
    }

    // Draw body text
    {
      const actualFontStyle = theme.headerFontStyle ?? theme.fontStyle;
      const font = createFontSpecifier(theme.fontFamily, theme.fontSize, actualFontStyle);

      const { fontBoundingBoxAscent } = this.gui.getFontMetrics(font);
      const halfFontBoundingBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const actualFontColor = theme.headerFontColor ?? theme.fontColor;

      const clipRegion = this.makeHeaderAreaClipRegion();

      for (const columnIndex of this.tableColumnRange()) {
        const columnDef = this.props.columnDefs[columnIndex];
        const columnWidth = this.columnWidths[columnIndex];

        const columnPos = this.calculateColumnScreenX(columnIndex);

        const x = columnPos + theme.cellPadding;
        const y = theme.rowHeight / 2 + halfFontBoundingBoxAscent;
        const maxWidth = columnWidth - theme.cellPadding * 2;
        const text = columnDef.title;

        this.renderer.pushDrawCommand({
          type: "text",
          x,
          y,
          color: actualFontColor,
          text,
          font,
          maxWidth,
          clipRegion
        });
      }
    }

    {
      const actualFontStyle = theme.bodyFontStyle ?? theme.fontStyle;
      const font = createFontSpecifier(theme.fontFamily, theme.fontSize, actualFontStyle);

      const { fontBoundingBoxAscent } = this.gui.getFontMetrics(font);
      const halfFontBoundingBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const actualFontColor = theme.bodyFontColor ?? theme.fontColor;

      const clipRegion = this.makeBodyAreaClipRegion();

      for (const columnIndex of this.tableColumnRange()) {
        const columnDef = this.props.columnDefs[columnIndex];
        const columnWidth = this.columnWidths[columnIndex];

        const column_pos = this.calculateColumnScreenX(columnIndex);

        const x = column_pos + theme.cellPadding;
        const max_width = columnWidth - theme.cellPadding * 2;

        for (const row_index of this.tableRowRange()) {
          const data_row = this.props.dataRows[row_index];

          const row_pos = this.calculateRowScreenY(row_index);

          const y = row_pos + theme.rowHeight / 2 + halfFontBoundingBoxAscent;

          const value = this.props.selectProp(data_row, columnDef);
          const text = isNumber(value) ? value.toString() : (value as string);

          this.renderer.pushDrawCommand({
            type: "text",
            x,
            y,
            color: actualFontColor,
            text,
            font,
            maxWidth: max_width,
            clipRegion: clipRegion
          });
        }
      }
    }

    this.renderer.render();
  }

  refreshLayout() {
    let scrollWidth = 0;
    for (const width of this.columnWidths) {
      scrollWidth += width;
    }

    this.scrollWidth = scrollWidth;
    this.scrollHeight = this.props.dataRows.length * this.props.theme.rowHeight;

    const tableAreaOuterWidth  = this.tableWidth  - BORDER_WIDTH;
    const tableAreaOuterHeight = this.tableHeight - BORDER_WIDTH;

    const tableAreaInnerWidth  = tableAreaOuterWidth  - this.props.theme.scrollbarThickness - BORDER_WIDTH;
    const tableAreaInnerHeight = tableAreaOuterHeight - this.props.theme.scrollbarThickness - BORDER_WIDTH;

    const bodyAreaOuterHeight = tableAreaOuterHeight - this.props.theme.rowHeight;
    const bodyAreaInnerHeight = tableAreaInnerHeight - this.props.theme.rowHeight;

    if (tableAreaOuterWidth >= this.scrollWidth && bodyAreaOuterHeight >= this.scrollHeight) {
      this.overflowX = this.overflowY = false;
    } else {
      this.overflowX = tableAreaInnerWidth < this.scrollWidth;
      this.overflowY = bodyAreaInnerHeight < this.scrollHeight;
    }

    let tableAreaWidth: number;
    let bodyAreaWidth: number;

    if (this.overflowY) {
      tableAreaWidth = bodyAreaWidth = tableAreaInnerWidth;
    } else {
      tableAreaWidth = bodyAreaWidth = tableAreaOuterWidth;
    }

    let tableAreaHeight: number;
    let bodyAreaHeight: number;

    if (this.overflowX) {
      tableAreaHeight = tableAreaInnerHeight;
      bodyAreaHeight = bodyAreaInnerHeight;
    } else {
      tableAreaHeight = tableAreaOuterHeight;
      bodyAreaHeight = bodyAreaOuterHeight;
    }

    this.tableAreaX = 0;
    this.tableAreaY = 0;
    this.tableAreaWidth = tableAreaWidth;
    this.tableAreaHeight = tableAreaHeight;

    this.bodyAreaX = 0;
    this.bodyAreaY = this.props.theme.rowHeight;
    this.bodyAreaWidth = bodyAreaWidth;
    this.bodyAreaHeight = bodyAreaHeight;

    this.headerAreaX = 0;
    this.headerAreaY = 0;
    this.headerAreaWidth = tableAreaWidth;
    this.headerAreaHeight = this.props.theme.rowHeight;

    this.scrollWidthMinCapped = Math.max(this.scrollWidth, bodyAreaWidth);
    this.scrollHeightMinCapped = Math.max(this.scrollHeight, bodyAreaHeight);

    this.maxScrollX = this.scrollWidthMinCapped - bodyAreaWidth;
    this.maxScrollY = this.scrollHeightMinCapped - bodyAreaHeight;

    this.bodyVisibleWidth = Math.min(this.bodyAreaWidth, this.scrollWidth);
    this.bodyVisibleHeight = Math.min(this.bodyAreaHeight, this.scrollHeight);

    this.hsbX = BORDER_WIDTH;
    this.hsbY = tableAreaHeight + BORDER_WIDTH;
    this.hsbWidth = tableAreaWidth - BORDER_WIDTH;
    this.hsbHeight = this.props.theme.scrollbarThickness;

    this.hsbTrackX      = this.hsbX      + this.props.theme.scrollbarTrackMargin;
    this.hsbTrackY      = this.hsbY      + this.props.theme.scrollbarTrackMargin;
    this.hsbTrackWidth  = this.hsbWidth  - this.props.theme.scrollbarTrackMargin * 2;
    this.hsbTrackHeight = this.hsbHeight - this.props.theme.scrollbarTrackMargin * 2;

    this.hsbThumbY = this.hsbTrackY;
    this.hsbThumbHeight = this.hsbTrackHeight;
    this.hsbThumbWidth = Math.max((bodyAreaWidth / this.scrollWidthMinCapped) * this.hsbTrackWidth, MIN_THUMB_LENGTH);
    this.hsbThumbMinX = this.hsbTrackX;
    this.hsbThumbMaxX = this.hsbTrackX + this.hsbTrackWidth - this.hsbThumbWidth;

    this.vsbX = tableAreaWidth + BORDER_WIDTH;
    this.vsbY = this.props.theme.rowHeight + BORDER_WIDTH;
    this.vsbWidth = this.props.theme.scrollbarThickness;
    this.vsbHeight = bodyAreaHeight - BORDER_WIDTH;

    this.vsbTrackX      = this.vsbX      + this.props.theme.scrollbarTrackMargin;
    this.vsbTrackY      = this.vsbY      + this.props.theme.scrollbarTrackMargin;
    this.vsbTrackWidth  = this.vsbWidth  - this.props.theme.scrollbarTrackMargin * 2;
    this.vsbTrackHeight = this.vsbHeight - this.props.theme.scrollbarTrackMargin * 2;

    this.vsbThumbX = this.vsbTrackX;
    this.vsbThumbWidth = this.vsbTrackWidth;
    this.vsbThumbHeight = Math.max((bodyAreaHeight / this.scrollHeightMinCapped) * this.vsbTrackHeight, MIN_THUMB_LENGTH);
    this.vsbThumbMinY = this.vsbTrackY;
    this.vsbThumbMaxY = this.vsbTrackY + this.vsbTrackHeight - this.vsbThumbHeight;
  }

  refreshViewport() {
    let columnPos = 0;
    this.canonicalColumnPositions = [];

    for (this.columnStart = 0; this.columnStart < this.columnWidths.length; this.columnStart++) {
      const column_width = this.columnWidths[this.columnStart];
      const nextColumnPos = columnPos + column_width;
      if (nextColumnPos > this.scrollX) {
        break;
      }
      this.canonicalColumnPositions.push(columnPos);
      columnPos = nextColumnPos;
    }

    for (this.columnEnd = this.columnStart; this.columnEnd < this.columnWidths.length; this.columnEnd++) {
      if (columnPos >= this.scrollX + this.bodyAreaWidth) {
        break;
      }

      this.canonicalColumnPositions.push(columnPos);
      columnPos += this.columnWidths[this.columnEnd];
    }

    this.rowStart = Math.floor(this.scrollY / this.props.theme.rowHeight);
    this.rowEnd = Math.min(Math.ceil((this.scrollY + this.bodyAreaHeight) / this.props.theme.rowHeight), this.props.dataRows.length);
  }

  resizeTableColumn(columnIndex: number, columnWidth: number) {
    this.columnWidths[columnIndex] = columnWidth;

    this.refreshLayout();

    this.scrollX = Math.min(this.scrollX, this.maxScrollX);
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);

    this.refreshViewport();

    this.hsbThumbX = this.calculateHorizontalScrollbarThumbX(this.scrollX);
    this.vsbThumbY = this.calculateVerticalScrollbarThumbY(this.scrollY);

    const columnDef = this.props.columnDefs[columnIndex];
    this.props.onResizeColumn?.(columnDef.key, columnWidth);
  }

  *tableColumnRange(start = 0) {
    for (let j = this.columnStart + start; j < this.columnEnd; j++) {
      yield j;
    }
  }

  *tableRowRange(start = 0) {
    for (let i = this.rowStart + start; i < this.rowEnd; i++) {
      yield i;
    }
  }

  calculateResizerScrollX(columnIndex: number) {
    const columnWidth = this.columnWidths[columnIndex];
    const columnScrollLeft = this.calculateColumnScrollX(columnIndex);
    const columnScrollRight = columnScrollLeft + columnWidth;
    const resizerScrollLeft = Math.min(
      columnScrollRight - COLUMN_RESIZER_LEFT_WIDTH,
      this.scrollWidthMinCapped - COLUMN_RESIZER_WIDTH
    );
    return resizerScrollLeft;
  }

  calculateColumnScrollX(columnIndex: number) {
    return this.canonicalColumnPositions[columnIndex];
  }

  calculateRowScrollY(rowIndex: number) {
    return rowIndex * this.props.theme.rowHeight;
  }

  calculateColumnScreenX(columnIndex: number) {
    const canonicalPos = this.calculateColumnScrollX(columnIndex);
    const screenColumnX = this.scrollToScreenX(canonicalPos);
    return screenColumnX;
  }

  calculateRowScreenY(rowIndex: number) {
    const canonicalPos = this.calculateRowScrollY(rowIndex);
    const screenRowY = this.scrollToScreenY(canonicalPos) + this.props.theme.rowHeight;
    return screenRowY;
  }

  scrollToScreenX(canonicalX: number) {
    return canonicalX - this.scrollX;
  }

  scrollToScreenY(canonicalY: number) {
    return canonicalY - this.scrollY;
  }

  screenToScrollX(screenX: number) {
    return screenX + this.scrollX;
  }

  screenToScrollY(screenY: number) {
    return screenY + this.scrollY;
  }

  calculateScrollX(hsbThumbX: number) {
    return Math.round(lerp(hsbThumbX, this.hsbThumbMinX, this.hsbThumbMaxX, 0, this.maxScrollX));
  }

  calculateScrollY(vsbThumbY: number) {
    return Math.round(lerp(vsbThumbY, this.vsbThumbMinY, this.vsbThumbMaxY, 0, this.maxScrollY));
  }

  calculateHorizontalScrollbarThumbX(scrollX: number) {
    return Math.round(lerp(scrollX, 0, this.maxScrollX, this.hsbThumbMinX, this.hsbThumbMaxX));
  }

  calculateVerticalScrollbarThumbY(scrollY: number) {
    return Math.round(lerp(scrollY, 0, this.maxScrollY, this.vsbThumbMinY, this.vsbThumbMaxY));
  }

  makeBodyAreaClipRegion() {
    const bodyClipRegion = new Path2D();
    bodyClipRegion.rect(this.bodyAreaX, this.bodyAreaY, this.bodyAreaWidth, this.bodyAreaHeight);
    return bodyClipRegion;
  }

  makeHeaderAreaClipRegion() {
    const headerAreaRegion = new Path2D();
    headerAreaRegion.rect(this.headerAreaX, this.headerAreaY, this.headerAreaWidth, this.headerAreaHeight);
    return headerAreaRegion;
  }
}

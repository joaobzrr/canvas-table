import { Platform } from "./Platform";
import { Renderer } from "./Renderer";
import { GuiContext } from "./GuiContext";
import { TableState } from "./TableState";
import { defaultTheme } from "./defaultTheme";
import { clamp, createFontSpecifier, isNumber, shallowMerge } from "./utils";
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  MIN_COLUMN_WIDTH,
  MOUSE_BUTTONS
} from "./constants";
import {
  CanvasTableProps,
  CanvasTableParams,
  ColumnDef,
  DataRow,
  DataRowId,
  PropValue,
  IdSelector,
  PropSelector
} from "./types";

export class CanvasTable {
  platform: Platform;
  renderer: Renderer;
  guictx: GuiContext;
  state: TableState;

  batchedProps: Partial<CanvasTableProps>[] = [];

  constructor(params: CanvasTableParams) {
    this.platform = new Platform(params.container);
    this.platform.updateFunction = this.update.bind(this);
    this.renderer = new Renderer({ canvas: this.platform.canvas, ctx: this.platform.ctx });
    this.guictx = new GuiContext();

    const props = CanvasTable.createInitialProps(params);
    this.state = new TableState(props);

    this.platform.startAnimation();
  }

  static createInitialProps({ container: _, ...params }: CanvasTableParams) {
    const theme = params.theme ?? defaultTheme;

    let selectId = params.selectId as IdSelector;
    if (!params.selectId) {
      selectId = (row: DataRow) => row.id as DataRowId;
    }

    let selectProp = params.selectProp as PropSelector;
    if (!params.selectProp) {
      selectProp = (row: DataRow, columnDef: ColumnDef) => row[columnDef.key] as PropValue;
    }

    return { ...params, theme, selectId, selectProp };
  }

  config(props: Partial<CanvasTableProps>) {
    this.batchedProps.push(props);
  }

  destroy() {
    this.platform.destroy();
  }

  update() {
    const { theme } = this.state.props;

    let scrollAmountX: number;
    let scrollAmountY: number;
    if (this.guictx.isNoWidgetActive()) {
      scrollAmountX = this.platform.scrollAmountX;
      scrollAmountY = this.platform.scrollAmountY;
    } else {
      scrollAmountX = 0;
      scrollAmountY = 0;
    }

    this.state = this.state.update(
      this.mergeBatchedProps(),
      this.platform.canvas.width,
      this.platform.canvas.height,
      scrollAmountX,
      scrollAmountY
    );

    if (this.platform.isMouseInRect(this.state.layout.bodyAreaX, this.state.layout.bodyAreaY, this.state.layout.bodyVisibleWidth, this.state.layout.bodyVisibleHeight)) {
      this.state.extra.mouseRow = Math.floor((this.state.screenToScrollY(this.platform.currMouseY) - theme.rowHeight) / theme.rowHeight);
    } else {
      this.state.extra.mouseRow = -1;
    }

    // Do column resizers
    for (const columnIndex of this.state.columnRange()) {
      const id = `column-resizer-${columnIndex}`;

      let resizerScrollX = this.state.calculateResizerScrollX(columnIndex);
      if (this.guictx.isWidgetActive(id)) {
        if (this.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
          this.guictx.setActiveWidget(null);
        } else {
          const columnScrollLeft = this.state.calculateColumnScrollX(columnIndex);
          const columnScrollRight = this.state.extra.dragAnchorX + this.platform.dragDistanceX;
          const columnWidth = Math.max(columnScrollRight - columnScrollLeft, MIN_COLUMN_WIDTH);
          this.state.resizeColumn(columnIndex, columnWidth);

          resizerScrollX = this.state.calculateResizerScrollX(columnIndex);
        }
      } else if (this.guictx.isWidgetHot(id)) {
        if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
          this.guictx.setActiveWidget(id);
          this.state.extra.dragAnchorX = resizerScrollX + COLUMN_RESIZER_LEFT_WIDTH;
        }
      }

      const resizerX = this.state.scrollToScreenX(resizerScrollX);
      const resizerY = BORDER_WIDTH;
      const resizerWidth = COLUMN_RESIZER_WIDTH;
      const resizerHeight = theme.rowHeight - BORDER_WIDTH;

      const inside = this.platform.isMouseInRect(resizerX, resizerY, resizerWidth, resizerHeight);
      if (inside) {
        this.guictx.setHotWidget(id);
      } else if (this.guictx.isWidgetHot(id)) {
        this.guictx.setHotWidget(null);
      }

      if (this.guictx.isWidgetActive(id) || this.guictx.isWidgetHot(id)) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: resizerX,
          y: resizerY,
          width: resizerWidth,
          height: resizerHeight,
          fillColor: theme.columnResizerColor,
          clipRegion: this.state.extra.headerAreaClipRegion,
          sortOrder: 5
        });
        break;
      }
    }

    // Do horizontal scrollbar
    if (this.state.layout.overflowX) {
      if (theme.scrollbarTrackColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.state.layout.hsbX,
          y: this.state.layout.hsbY,
          width: this.state.layout.hsbWidth,
          height: this.state.layout.hsbHeight,
          fillColor: theme.scrollbarTrackColor,
          sortOrder: 3
        });
      }

      const id = "horizontal-scrollbar-thumb";
      if (this.guictx.isWidgetActive(id)) {
        if (this.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
          this.guictx.setActiveWidget(null);
        } else {
          this.state.layout.hsbThumbX = clamp(this.state.extra.dragAnchorX + this.platform.dragDistanceX, this.state.layout.hsbThumbMinX, this.state.layout.hsbThumbMaxX);
          this.state.layout.scrollX = this.state.calculateScrollX(this.state.layout.hsbThumbX);
          this.state.refreshViewport();
        }
      } else if (this.guictx.isWidgetHot(id)) {
        if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
          this.guictx.setActiveWidget(id);
          this.state.extra.dragAnchorX = this.state.layout.hsbThumbX;
        }
      }

      const inside = this.platform.isMouseInRect(this.state.layout.hsbThumbX, this.state.layout.hsbThumbY, this.state.layout.hsbThumbWidth, this.state.layout.hsbThumbHeight);
      if (inside) {
        this.guictx.setHotWidget(id);
      } else if (this.guictx.isWidgetHot(id)) {
        this.guictx.setHotWidget(null);
      }

      let fillColor: string | undefined;
      if (this.guictx.isWidgetActive(id)) {
        fillColor = theme.scrollbarThumbPressedColor;
      } else if (this.guictx.isWidgetHot(id)) {
        fillColor = theme.scrollbarThumbHoverColor;
      } else {
        fillColor = theme.scrollbarThumbColor;
      }

      if (fillColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.state.layout.hsbThumbX,
          y: this.state.layout.hsbThumbY,
          width: this.state.layout.hsbThumbWidth,
          height: this.state.layout.hsbThumbHeight,
          fillColor: fillColor,
          sortOrder: 4
        });
      }
    }

    // Do vertical scrollbar
    if (this.state.layout.overflowY) {
      if (theme.scrollbarTrackColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.state.layout.vsbX,
          y: this.state.layout.vsbY,
          width: this.state.layout.vsbWidth,
          height: this.state.layout.vsbHeight,
          fillColor: theme.scrollbarTrackColor,
          sortOrder: 3
        });
      }

      const id = "vertical-scrollbar-thumb";
      if (this.guictx.isWidgetActive(id)) {
        if (this.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
          this.guictx.setActiveWidget(null);
        } else {
          this.state.layout.vsbThumbY = clamp(this.state.extra.dragAnchorY + this.platform.dragDistanceY, this.state.layout.vsbThumbMinY, this.state.layout.vsbThumbMaxY);
          this.state.layout.scrollY = this.state.calculateScrollY(this.state.layout.vsbThumbY);
          this.state.refreshViewport();
        }
      } else if (this.guictx.isWidgetHot(id)) {
        if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
          this.guictx.setActiveWidget(id);

          this.state.extra.dragAnchorY = this.state.layout.vsbThumbY;
        }
      }

      const inside = this.platform.isMouseInRect(this.state.layout.vsbThumbX, this.state.layout.vsbThumbY, this.state.layout.vsbThumbWidth, this.state.layout.vsbThumbHeight);
      if (inside) {
        this.guictx.setHotWidget(id);
      } else if (this.guictx.isWidgetHot(id)) {
        this.guictx.setHotWidget(null);
      }

      let fillColor: string | undefined;
      if (this.guictx.isWidgetActive(id)) {
        fillColor = theme.scrollbarThumbPressedColor;
      } else if (this.guictx.isWidgetHot(id)) {
        fillColor = theme.scrollbarThumbHoverColor;
      } else {
        fillColor = theme.scrollbarThumbColor;
      }

      if (fillColor) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: this.state.layout.vsbThumbX,
          y: this.state.layout.vsbThumbY,
          width: this.state.layout.vsbThumbWidth,
          height: this.state.layout.vsbThumbHeight,
          fillColor: fillColor,
          sortOrder: 4
        });
      }
    }

    // Draw hovered and selected rows
    if (this.state.extra.mouseRow !== -1) {
      const dataRow = this.state.props.dataRows[this.state.extra.mouseRow];
      if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        const dataRowId = this.state.props.selectId(dataRow);
        if (dataRowId !== this.state.props.selectedRowId) {
          this.state.props.selectedRowId = dataRowId;
          this.state.props.onSelectRow?.(dataRowId, dataRow);
        }
      }

      if (theme.hoveredRowColor && this.guictx.isNoWidgetActive()) {
        this.renderer.pushDrawCommand({
          type: "rect",
          x: 0,
          y: this.state.calculateRowScreenY(this.state.extra.mouseRow),
          width: this.state.layout.bodyVisibleWidth,
          height: theme.rowHeight,
          fillColor: theme.hoveredRowColor,
          clipRegion: this.state.extra.bodyAreaClipRegion,
          sortOrder: 1
        });
      }
    }

    if (this.state.props.selectedRowId !== null) {
      for (const rowIndex of this.state.rowRange()) {
        const dataRow = this.state.props.dataRows[rowIndex];
        const dataRowId = this.state.props.selectId(dataRow);
        if (this.state.props.selectedRowId == dataRowId) {
          this.renderer.pushDrawCommand({
            type: "rect",
            x: 0,
            y: this.state.calculateRowScreenY(rowIndex),
            width: this.state.layout.bodyVisibleWidth,
            height: theme.rowHeight,
            fillColor: theme.selectedRowColor,
            clipRegion: this.state.extra.bodyAreaClipRegion,
            sortOrder: 1
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
        width: this.state.layout.tableWidth,
        height: this.state.layout.tableHeight,
        fillColor: theme.tableBackgroundColor
      });
    }

    if (theme.bodyBackgroundColor) {
      this.renderer.pushDrawCommand({
        type: "rect",
        x: this.state.layout.bodyAreaX,
        y: this.state.layout.bodyAreaY,
        width: this.state.layout.bodyAreaWidth,
        height: this.state.layout.bodyAreaHeight,
        fillColor: theme.bodyBackgroundColor
      });
    }

    if (theme.headerBackgroundColor) {
      this.renderer.pushDrawCommand({
        type: "rect",
        x: this.state.layout.headerAreaX,
        y: this.state.layout.headerAreaY,
        width: this.state.layout.headerAreaWidth,
        height: this.state.layout.headerAreaHeight,
        fillColor: theme.headerBackgroundColor
      });
    }

    // Draw top outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: 0,
      length: this.state.layout.tableWidth,
      color: theme.tableBorderColor,
      sortOrder: 4
    });

    // Draw bottom outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: this.state.layout.tableHeight - BORDER_WIDTH,
      length: this.state.layout.tableWidth,
      color: theme.tableBorderColor,
      sortOrder: 4
    });

    // Draw left outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "vertical",
      x: 0,
      y: 0,
      length: this.state.layout.tableHeight,
      color: theme.tableBorderColor,
      sortOrder: 4
    });

    // Draw right outer table border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "vertical",
      x: this.state.layout.tableWidth - BORDER_WIDTH,
      y: 0,
      length: this.state.layout.tableHeight,
      color: theme.tableBorderColor,
      sortOrder: 4
    });

    const gridWidth = this.state.layout.bodyVisibleWidth;
    const gridHeight = this.state.layout.bodyVisibleHeight + theme.rowHeight;

    // Draw header bottom border
    this.renderer.pushDrawCommand({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: theme.rowHeight,
      length: this.state.layout.tableWidth,
      color: theme.tableBorderColor,
      sortOrder: 4
    });

    // If horizontal scrollbar is visible, draw its border, otherwise,
    // draw table content right border
    if (this.state.layout.overflowX) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.state.layout.hsbY - BORDER_WIDTH,
        length: this.state.layout.tableWidth,
        color: theme.tableBorderColor,
        sortOrder: 4
      });
    } else {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "vertical",
        x: gridWidth,
        y: 0,
        length: gridHeight,
        color: theme.tableBorderColor,
        sortOrder: 4
      });
    }

    // If vertical scrollbar is visible, draw its border, otherwise,
    // draw table content bottom border
    if (this.state.layout.overflowY) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "vertical",
        x: this.state.layout.vsbX - BORDER_WIDTH,
        y: 0,
        length: this.state.layout.tableHeight,
        color: theme.tableBorderColor,
        sortOrder: 4
      });
    } else {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: gridHeight,
        length: gridWidth,
        color: theme.tableBorderColor,
        sortOrder: 4
      });
    }

    // Draw grid horizontal lines
    for (const rowIndex of this.state.rowRange(1)) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.state.calculateRowScreenY(rowIndex),
        length: gridWidth,
        color: theme.tableBorderColor,
        sortOrder: 4
      });
    }

    // Draw grid vertical lines
    for (const columnIndex of this.state.columnRange(1)) {
      this.renderer.pushDrawCommand({
        type: "line",
        orientation: "vertical",
        x: this.state.calculateColumnScreenX(columnIndex),
        y: 0,
        length: gridHeight,
        color: theme.tableBorderColor,
        sortOrder: 4
      });
    }

    // Draw header text
    {
      const fontStyle = theme.headerFontStyle ?? theme.fontStyle;
      const font = createFontSpecifier(theme.fontFamily, theme.fontSize, fontStyle);

      const { fontBoundingBoxAscent, fontBoundingBoxDescent } = this.platform.getFontMetrics(font);
      const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
      const baselineY = Math.floor((theme.rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

      const fontColor = theme.headerFontColor ?? theme.fontColor;

      for (const columnIndex of this.state.columnRange()) {
        const columnDef = this.state.props.columnDefs[columnIndex];
        const columnWidth = this.state.layout.columnWidths[columnIndex];

        const columnPos = this.state.calculateColumnScreenX(columnIndex);

        const x = columnPos + theme.cellPadding;
        const y = baselineY;

        const maxWidth = columnWidth - theme.cellPadding * 2;
        const text = columnDef.title;

        const { chars, subpixelOffsets } = this.renderer.textRenderer.prepareText(
          text, x, font, fontColor, maxWidth, true);

        this.renderer.pushDrawCommand({
          type: "text",
          chars,
          subpixelOffsets,
          x,
          y,
          font,
          color: fontColor,
          clipRegion: this.state.extra.headerAreaClipRegion,
          sortOrder: 2
        });
      }
    }

    // Draw body text
    {
      const fontStyle = theme.bodyFontStyle ?? theme.fontStyle;
      const font = createFontSpecifier(theme.fontFamily, theme.fontSize, fontStyle);

      const { fontBoundingBoxAscent, fontBoundingBoxDescent } = this.platform.getFontMetrics(font);
      const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
      const baselineY = Math.floor((theme.rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

      const fontColor = theme.bodyFontColor ?? theme.fontColor;

      for (const columnIndex of this.state.columnRange()) {
        const columnDef = this.state.props.columnDefs[columnIndex];
        const columnWidth = this.state.layout.columnWidths[columnIndex];

        const column_pos = this.state.calculateColumnScreenX(columnIndex);

        const x = column_pos + theme.cellPadding;
        const maxWidth = columnWidth - theme.cellPadding * 2;

        for (const row_index of this.state.rowRange()) {
          const dataRow = this.state.props.dataRows[row_index];

          const rowPos = this.state.calculateRowScreenY(row_index);
          const y = rowPos + baselineY;

          const value = this.state.props.selectProp(dataRow, columnDef);
          const text = isNumber(value) ? value.toString() : (value as string);

          const { chars, subpixelOffsets } = this.renderer.textRenderer.prepareText(
            text, x, font, fontColor, maxWidth, true);

          this.renderer.pushDrawCommand({
            type: "text",
            chars,
            subpixelOffsets,
            x,
            y,
            font,
            color: fontColor,
            clipRegion: this.state.extra.bodyAreaClipRegion,
            sortOrder: 2
          });
        }
      }
    }

    this.renderer.render();
  }

  mergeBatchedProps() {
    const props = {} as Partial<CanvasTableProps>;
    while (this.batchedProps.length > 0) {
      shallowMerge(props, this.batchedProps.shift());
    }
    return props;
  }
}

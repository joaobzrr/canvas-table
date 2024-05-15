import { type Platform } from './Platform';
import { type TableState } from './TableState';
import { Renderer } from './Renderer';
import { createFontSpecifier, isNumber } from './utils';
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  MOUSE_BUTTONS,
} from './constants';

export class Gui {
  platform: Platform;
  state: TableState;
  renderer: Renderer;

  constructor(platform: Platform, state: TableState) {
    this.platform = platform;
    this.state = state;
    this.renderer = new Renderer({
      canvas: this.platform.canvas,
      ctx: this.platform.ctx,
    });
  }

  private doColumnResizer(columnIndex: number) {
    const { props, guictx } = this.state;
    const { rowHeight } = props.theme;

    const initialResizerScrollX = this.state.calculateResizerScrollX(columnIndex);
    let columnWasResized = false;

    const id = `column-resizer-${columnIndex}`;
    if (guictx.isWidgetActive(id)) {
      if (this.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        guictx.setActiveWidget(null);
      } else {
        this.state.dragColumnResizer(columnIndex);
        columnWasResized = true;
      }
    } else if (guictx.isWidgetHot(id)) {
      if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        guictx.setActiveWidget(id);
        guictx.dragAnchorX = initialResizerScrollX + COLUMN_RESIZER_LEFT_WIDTH;
      }
    }

    let finalResizerScrollX: number;
    if (columnWasResized) {
      finalResizerScrollX = this.state.calculateResizerScrollX(columnIndex);
    } else {
      finalResizerScrollX = initialResizerScrollX;
    }

    const x = this.state.scrollToScreenX(finalResizerScrollX);
    const y = BORDER_WIDTH;
    const width = COLUMN_RESIZER_WIDTH;
    const height = rowHeight - BORDER_WIDTH;

    const inside = this.platform.isMouseInRect(x, y, width, height);
    if (inside) {
      guictx.setHotWidget(id);
    } else if (guictx.isWidgetHot(id)) {
      guictx.setHotWidget(null);
    }

    if (guictx.isWidgetActive(id) || guictx.isWidgetHot(id)) {
      const { columnResizerColor } = props.theme;
      const { headAreaClipRegion } = guictx;

      this.renderer.pushDrawCommand({
        type: 'rect',
        x,
        y,
        width,
        height,
        fillColor: columnResizerColor,
        clipRegion: headAreaClipRegion,
        sortOrder: 5,
      });
      return true;
    }

    return false;
  }

  private doHorizontalScrollbar() {
    const { props, layout, guictx } = this.state;

    const { scrollbarTrackColor } = props.theme;
    if (scrollbarTrackColor) {
      const { hsbX, hsbY, hsbWidth, hsbHeight } = layout;
      this.renderer.pushDrawCommand({
        type: 'rect',
        x: hsbX,
        y: hsbY,
        width: hsbWidth,
        height: hsbHeight,
        fillColor: scrollbarTrackColor,
        sortOrder: 3,
      });
    }

    const id = 'horizontal-scrollbar-thumb';
    if (guictx.isWidgetActive(id)) {
      if (this.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        guictx.setActiveWidget(null);
      } else {
        this.state.dragHorizontalScrollbarThumb();
      }
    } else if (guictx.isWidgetHot(id)) {
      if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        guictx.setActiveWidget(id);
        guictx.dragAnchorX = layout.hsbThumbX;
      }
    }

    const {
      hsbThumbX: x,
      hsbThumbY: y,
      hsbThumbWidth: width,
      hsbThumbHeight: height,
    } = this.state.layout;

    const inside = this.platform.isMouseInRect(x, y, width, height);
    if (inside) {
      guictx.setHotWidget(id);
    } else if (guictx.isWidgetHot(id)) {
      guictx.setHotWidget(null);
    }

    const { scrollbarThumbPressedColor, scrollbarThumbHoverColor, scrollbarThumbColor } =
      props.theme;

    let fillColor: string | undefined;
    if (guictx.isWidgetActive(id)) {
      fillColor = scrollbarThumbPressedColor;
    } else if (guictx.isWidgetHot(id)) {
      fillColor = scrollbarThumbHoverColor;
    } else {
      fillColor = scrollbarThumbColor;
    }

    if (fillColor) {
      this.renderer.pushDrawCommand({
        type: 'rect',
        x,
        y,
        width,
        height,
        fillColor: fillColor,
        sortOrder: 4,
      });
    }
  }

  private doVerticalScrollbar() {
    const { props, layout, guictx } = this.state;

    const { scrollbarTrackColor } = props.theme;
    if (scrollbarTrackColor) {
      const { vsbX, vsbY, vsbWidth, vsbHeight } = layout;
      this.renderer.pushDrawCommand({
        type: 'rect',
        x: vsbX,
        y: vsbY,
        width: vsbWidth,
        height: vsbHeight,
        fillColor: scrollbarTrackColor,
        sortOrder: 3,
      });
    }

    const id = 'vertical-scrollbar-thumb';
    if (guictx.isWidgetActive(id)) {
      if (this.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        guictx.setActiveWidget(null);
      } else {
        this.state.dragVerticalScrollbarThumb();
      }
    } else if (guictx.isWidgetHot(id)) {
      if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        guictx.setActiveWidget(id);
        guictx.dragAnchorY = layout.vsbThumbY;
      }
    }

    const {
      vsbThumbX: x,
      vsbThumbY: y,
      vsbThumbWidth: width,
      vsbThumbHeight: height,
    } = this.state.layout;

    const inside = this.platform.isMouseInRect(x, y, width, height);
    if (inside) {
      guictx.setHotWidget(id);
    } else if (guictx.isWidgetHot(id)) {
      guictx.setHotWidget(null);
    }

    const { scrollbarThumbPressedColor, scrollbarThumbHoverColor, scrollbarThumbColor } =
      props.theme;

    let fillColor: string | undefined;
    if (guictx.isWidgetActive(id)) {
      fillColor = scrollbarThumbPressedColor;
    } else if (guictx.isWidgetHot(id)) {
      fillColor = scrollbarThumbHoverColor;
    } else {
      fillColor = scrollbarThumbColor;
    }

    if (fillColor) {
      this.renderer.pushDrawCommand({
        type: 'rect',
        x,
        y,
        width,
        height,
        fillColor: fillColor,
        sortOrder: 4,
      });
    }
  }

  private doRows() {
    const { props, layout, guictx } = this.state;
    const { rowHeight } = props.theme;
    const { bodyVisibleWidth } = layout;
    const { hoveredRowIndex, bodyAreaClipRegion } = guictx;

    if (hoveredRowIndex !== -1) {
      if (this.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        const dataRow = props.dataRows[hoveredRowIndex];
        const dataRowId = props.selectId(dataRow);

        if (dataRowId !== props.selectedRowId) {
          props.selectedRowId = dataRowId;
          props.onSelectRow?.(dataRowId, dataRow);
        }
      }

      const { hoveredRowBackgroundColor } = props.theme;
      if (hoveredRowBackgroundColor && guictx.isNoWidgetActive()) {
        this.renderer.pushDrawCommand({
          type: 'rect',
          x: 0,
          y: this.state.calculateRowScreenY(hoveredRowIndex),
          width: bodyVisibleWidth,
          height: rowHeight,
          fillColor: hoveredRowBackgroundColor,
          clipRegion: bodyAreaClipRegion,
          sortOrder: 1,
        });
      }
    }

    if (props.selectedRowId !== null) {
      for (const rowIndex of this.state.rowRange()) {
        const dataRow = props.dataRows[rowIndex];
        const dataRowId = props.selectId(dataRow);

        if (props.selectedRowId == dataRowId) {
          const { selectedRowBackgroundColor } = props.theme;

          this.renderer.pushDrawCommand({
            type: 'rect',
            x: 0,
            y: this.state.calculateRowScreenY(rowIndex),
            width: bodyVisibleWidth,
            height: rowHeight,
            fillColor: selectedRowBackgroundColor,
            clipRegion: bodyAreaClipRegion,
            sortOrder: 1,
          });
          break;
        }
      }
    }
  }

  private drawTableBackground() {
    const { tableWidth, tableHeight } = this.state.layout;
    const { tableBackgroundColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'rect',
      x: 0,
      y: 0,
      width: tableWidth,
      height: tableHeight,
      fillColor: tableBackgroundColor,
    });
  }

  private drawBodyBackground() {
    const { bodyAreaX, bodyAreaY, bodyAreaWidth, bodyAreaHeight } = this.state.layout;

    const { bodyBackgroundColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'rect',
      x: bodyAreaX,
      y: bodyAreaY,
      width: bodyAreaWidth,
      height: bodyAreaHeight,
      fillColor: bodyBackgroundColor,
    });
  }

  private drawHeadBackground() {
    const { headAreaX, headAreaY, headAreaWidth, headAreaHeight } = this.state.layout;

    const { headBackgroundColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'rect',
      x: headAreaX,
      y: headAreaY,
      width: headAreaWidth,
      height: headAreaHeight,
      fillColor: headBackgroundColor,
    });
  }

  private drawTopRightCornerBackground() {
    const { vsbX, vsbWidth } = this.state.layout;
    const { rowHeight, topRightCornerBackgroundColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'rect',
      x: vsbX,
      y: 0,
      width: vsbWidth,
      height: rowHeight,
      fillColor: topRightCornerBackgroundColor,
    });
  }

  private drawBottomRightCornerBackground() {
    const { hsbY, vsbX, vsbWidth } = this.state.layout;
    const { scrollbarThickness, bottomRightCornerBackgroundColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'rect',
      x: vsbX,
      y: hsbY,
      width: vsbWidth,
      height: scrollbarThickness,
      fillColor: bottomRightCornerBackgroundColor,
    });
  }

  private drawEvenRowsBackground() {
    const { gridWidth } = this.state.layout;
    const { rowHeight, evenRowBackgroundColor } = this.state.props.theme;
    const { bodyAreaClipRegion } = this.state.guictx;

    const x = 0;
    const width = gridWidth;
    const height = rowHeight;

    for (const rowIndex of this.state.rowRange(0, 2)) {
      const y = this.state.calculateRowScreenY(rowIndex);
      this.renderer.pushDrawCommand({
        type: 'rect',
        x,
        y,
        width,
        height,
        fillColor: evenRowBackgroundColor,
        clipRegion: bodyAreaClipRegion,
      });
    }
  }

  private drawOddRowsBackground() {
    const { gridWidth } = this.state.layout;
    const { rowHeight, oddRowBackgroundColor } = this.state.props.theme;
    const { bodyAreaClipRegion } = this.state.guictx;

    const x = 0;
    const width = gridWidth;
    const height = rowHeight;

    for (const rowIndex of this.state.rowRange(1, 2)) {
      const y = this.state.calculateRowScreenY(rowIndex);
      this.renderer.pushDrawCommand({
        type: 'rect',
        x,
        y,
        width,
        height,
        fillColor: oddRowBackgroundColor,
        clipRegion: bodyAreaClipRegion,
      });
    }
  }

  private drawOuterTableBorders() {
    const { tableWidth, tableHeight } = this.state.layout;
    const { borderColor } = this.state.props.theme;

    // Draw top outer table border
    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: 0,
      length: tableWidth,
      color: borderColor,
      sortOrder: 4,
    });

    // Draw bottom outer table border
    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: tableHeight - BORDER_WIDTH,
      length: tableWidth,
      color: borderColor,
      sortOrder: 4,
    });

    // Draw left outer table border
    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: 0,
      y: 0,
      length: tableHeight,
      color: borderColor,
      sortOrder: 4,
    });

    // Draw right outer table border
    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: tableWidth - BORDER_WIDTH,
      y: 0,
      length: tableHeight,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawHeadBottomBorder() {
    const { tableWidth } = this.state.layout;
    const { rowHeight, borderColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: rowHeight,
      length: tableWidth,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawHorizontalScrollbarBorder() {
    const { tableWidth, hsbY } = this.state.layout;
    const { borderColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: hsbY - BORDER_WIDTH,
      length: tableWidth,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawVerticalScrollbarBorder() {
    const { tableHeight, vsbX } = this.state.layout;
    const { borderColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: vsbX - BORDER_WIDTH,
      y: 0,
      length: tableHeight,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawRightTableContentBorder() {
    const { gridWidth, gridHeight } = this.state.layout;
    const { borderColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: gridWidth,
      y: 0,
      length: gridHeight,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawBottomTableContentBorder() {
    const { gridWidth, gridHeight } = this.state.layout;
    const { borderColor } = this.state.props.theme;

    this.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: gridHeight,
      length: gridWidth,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawRowBorders() {
    const { gridWidth } = this.state.layout;
    const { borderColor } = this.state.props.theme;

    for (const rowIndex of this.state.rowRange(1)) {
      this.renderer.pushDrawCommand({
        type: 'line',
        orientation: 'horizontal',
        x: 0,
        y: this.state.calculateRowScreenY(rowIndex),
        length: gridWidth,
        color: borderColor,
        sortOrder: 4,
      });
    }
  }

  private drawColumnBorders() {
    const { gridHeight } = this.state.layout;
    const { borderColor } = this.state.props.theme;

    for (const columnIndex of this.state.columnRange(1)) {
      this.renderer.pushDrawCommand({
        type: 'line',
        orientation: 'vertical',
        x: this.state.calculateColumnScreenX(columnIndex),
        y: 0,
        length: gridHeight,
        color: borderColor,
        sortOrder: 4,
      });
    }
  }

  private drawHeadText() {
    const { columnDefs, theme } = this.state.props;
    const { columnWidths } = this.state.layout;

    const {
      rowHeight,
      cellPadding,
      fontSize,
      fontFamily,
      fontStyle,
      headFontStyle,
      fontColor,
      headFontColor,
    } = theme;

    const { headAreaClipRegion } = this.state.guictx;

    const { textRenderer } = this.renderer;

    const textStyle = headFontStyle ?? fontStyle;
    const font = createFontSpecifier(fontFamily, fontSize, textStyle);

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } = this.platform.getFontMetrics(font);

    const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
    const baselineY = Math.floor((rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

    const textColor = headFontColor ?? fontColor;

    for (const columnIndex of this.state.columnRange()) {
      const columnDef = columnDefs[columnIndex];
      const columnWidth = columnWidths[columnIndex];

      const columnPos = this.state.calculateColumnScreenX(columnIndex);

      const x = columnPos + cellPadding;
      const y = baselineY;

      const maxWidth = columnWidth - cellPadding * 2;
      const text = columnDef.title;

      const { chars, subpixelOffsets } = textRenderer.prepareText(
        text,
        x,
        font,
        textColor,
        maxWidth,
        true,
      );

      this.renderer.pushDrawCommand({
        type: 'text',
        chars,
        subpixelOffsets,
        x,
        y,
        font,
        color: textColor,
        clipRegion: headAreaClipRegion,
        sortOrder: 2,
      });
    }
  }

  private drawBodyText() {
    const { columnDefs, dataRows, theme, selectProp } = this.state.props;
    const { columnWidths } = this.state.layout;

    const {
      rowHeight,
      cellPadding,
      fontSize,
      fontFamily,
      fontStyle,
      bodyFontStyle,
      fontColor,
      bodyFontColor,
    } = theme;

    const { bodyAreaClipRegion } = this.state.guictx;

    const { textRenderer } = this.renderer;

    const textStyle = bodyFontStyle ?? fontStyle;
    const font = createFontSpecifier(fontFamily, fontSize, textStyle);

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } = this.platform.getFontMetrics(font);

    const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
    const baselineY = Math.floor((rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

    const textColor = bodyFontColor ?? fontColor;

    for (const columnIndex of this.state.columnRange()) {
      const columnDef = columnDefs[columnIndex];
      const columnWidth = columnWidths[columnIndex];

      const columnPos = this.state.calculateColumnScreenX(columnIndex);

      const x = columnPos + cellPadding;
      const maxWidth = columnWidth - cellPadding * 2;

      for (const rowIndex of this.state.rowRange()) {
        const dataRow = dataRows[rowIndex];

        const rowPos = this.state.calculateRowScreenY(rowIndex);
        const y = rowPos + baselineY;

        const value = selectProp(dataRow, columnDef);
        const text = isNumber(value) ? value.toString() : (value as string);

        const { chars, subpixelOffsets } = textRenderer.prepareText(
          text,
          x,
          font,
          fontColor,
          maxWidth,
          true,
        );

        this.renderer.pushDrawCommand({
          type: 'text',
          chars,
          subpixelOffsets,
          x,
          y,
          font,
          color: textColor,
          clipRegion: bodyAreaClipRegion,
          sortOrder: 2,
        });
      }
    }
  }

  public update(state: TableState) {
    this.state = state;

    const {
      layout,
      props: { theme },
    } = this.state;

    for (const columnIndex of this.state.columnRange()) {
      if (this.doColumnResizer(columnIndex)) {
        break;
      }
    }

    if (layout.overflowX) {
      this.doHorizontalScrollbar();
    }

    if (layout.overflowY) {
      this.doVerticalScrollbar();
    }

    this.doRows();

    if (theme.tableBackgroundColor) {
      this.drawTableBackground();
    }

    if (theme.bodyBackgroundColor) {
      this.drawBodyBackground();
    }

    if (theme.headBackgroundColor) {
      this.drawHeadBackground();
    }

    if (layout.overflowX && layout.overflowY) {
      if (theme.topRightCornerBackgroundColor) {
        this.drawTopRightCornerBackground();
      }
      if (theme.bottomRightCornerBackgroundColor) {
        this.drawBottomRightCornerBackground();
      }
    }

    if (theme.evenRowBackgroundColor) {
      this.drawEvenRowsBackground();
    }

    if (theme.oddRowBackgroundColor) {
      this.drawOddRowsBackground();
    }

    this.drawOuterTableBorders();

    const shouldDrawHeadBorder =
      (theme.headBorderWidth !== undefined && theme.headBorderWidth > 0) ||
      (theme.headBorderWidth === undefined && theme.borderWidth > 0);
    if (shouldDrawHeadBorder) {
      this.drawHeadBottomBorder();
    }

    if (layout.overflowX) {
      this.drawHorizontalScrollbarBorder();
    } else {
      this.drawRightTableContentBorder();
    }

    if (layout.overflowY) {
      this.drawVerticalScrollbarBorder();
    } else {
      this.drawBottomTableContentBorder();
    }

    const shouldDrawRowBorders =
      (theme.rowBorderWidth !== undefined && theme.rowBorderWidth > 0) ||
      (theme.rowBorderWidth === undefined && theme.borderWidth > 0);
    if (shouldDrawRowBorders) {
      this.drawRowBorders();
    }

    const shouldDrawColumnBorders =
      (theme.columnBorderWidth !== undefined && theme.columnBorderWidth > 0) ||
      (theme.columnBorderWidth === undefined && theme.borderWidth > 0);
    if (shouldDrawColumnBorders) {
      this.drawColumnBorders();
    }

    this.drawHeadText();

    this.drawBodyText();

    this.renderer.render();
  }

  public destroy() {
    this.platform.destroy();
  }
}

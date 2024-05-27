import { type Context } from './Context';
import { GuiContext } from './GuiContext';
import { createFontSpecifier, clamp, isNumber } from './utils';
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MOUSE_BUTTONS,
} from './constants';
import type { ColumnDef } from './types';

export type GuiParams = {
  context: Context;
};

export class Gui {
  private context: Context;
  private guictx: GuiContext;

  private hoveredRowIndex = -1;

  private dragAnchorX = 0;
  private dragAnchorY = 0;

  private headAreaClipRegion: Path2D = undefined!;
  private bodyAreaClipRegion: Path2D = undefined!;

  constructor(params: GuiParams) {
    this.context = params.context;
    this.guictx = new GuiContext();
  }

  public update() {
    const { layout } = this.context;
    const { theme } = this.context.props;

    this.prepareFrame();

    for (let j = layout.columnStart; j < layout.columnEnd; j++) {
      if (this.doColumnResizer(j)) {
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

    if (layout.overflowY && theme.topRightCornerBackgroundColor) {
      this.drawTopRightCornerBackground();
    }

    if (layout.overflowX && layout.overflowY && theme.bottomRightCornerBackgroundColor) {
      this.drawBottomRightCornerBackground();
    }

    if (theme.evenRowBackgroundColor) {
      this.drawEvenRowsBackground();
    }

    if (theme.oddRowBackgroundColor) {
      this.drawOddRowsBackground();
    }

    this.drawHeadBottomBorder();

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
      (theme.rowBorder !== undefined && theme.rowBorder) ||
      (theme.rowBorder === undefined && theme.border);
    if (shouldDrawRowBorders) {
      this.drawRowBorders();
    }

    const shouldDrawColumnBorders =
      (theme.columnBorder !== undefined && theme.columnBorder) ||
      (theme.columnBorder === undefined && theme.border);
    if (shouldDrawColumnBorders) {
      this.drawColumnBorders();
    }

    this.drawHeadText();

    this.drawBodyText();

    this.context.renderer.render();
  }

  public prepareFrame() {
    const { platform, layout, props } = this.context;
    const { theme } = props;

    layout.refreshLayout();

    let scrollAmountX: number;
    let scrollAmountY: number;
    if (this.guictx.isNoneActive()) {
      scrollAmountX = platform.scrollAmountX;
      scrollAmountY = platform.scrollAmountY;
    } else {
      scrollAmountX = 0;
      scrollAmountY = 0;
    }

    layout.updateScrollPos(scrollAmountX, scrollAmountY);
    layout.refreshViewport();

    const shouldSetContainerBorder =
      (theme.outerBorder !== undefined && theme.outerBorder) ||
      (theme.outerBorder === undefined && theme.border);
    if (shouldSetContainerBorder) {
      platform.setContainerBorder(theme.borderColor);
    }

    if (platform.mouseHasMoved) {
      this.hoveredRowIndex = layout.calculateHoveredRowIndex();
    }

    this.updateClipRegions();
  }

  public dragHorizontalScrollbarThumb() {
    const { dragDistanceX } = this.context.platform;
    const { hsbThumbMinX: min, hsbThumbMaxX: max } = this.context.layout;

    this.context.layout.hsbThumbX = clamp(this.dragAnchorX + dragDistanceX, min, max);
    this.context.layout.scrollLeft = this.context.layout.calculateScrollX(
      this.context.layout.hsbThumbX,
    );

    this.context.layout.refreshViewport();
  }

  public dragVerticalScrollbarThumb() {
    const { dragDistanceY } = this.context.platform;
    const { vsbThumbMinY: min, vsbThumbMaxY: max } = this.context.layout;

    this.context.layout.vsbThumbY = clamp(this.dragAnchorY + dragDistanceY, min, max);
    this.context.layout.scrollTop = this.context.layout.calculateScrollY(
      this.context.layout.vsbThumbY,
    );

    this.context.layout.refreshViewport();
  }

  public dragColumnResizer(columnIndex: number) {
    const { dragDistanceX } = this.context.platform;

    const columnScrollLeft = this.context.layout.calculateColumnScrollLeft(columnIndex);
    const columnScrollRight = this.dragAnchorX + dragDistanceX;
    const columnWidth = Math.max(columnScrollRight - columnScrollLeft + 1, MIN_COLUMN_WIDTH);

    this.resizeColumn(columnIndex, columnWidth);
  }

  public resizeColumn(columnIndex: number, columnWidth: number) {
    this.context.layout.columnWidths[columnIndex] = columnWidth;

    this.context.layout.refreshLayout();

    this.context.layout.scrollLeft = Math.min(
      this.context.layout.scrollLeft,
      this.context.layout.maxScrollX,
    );
    this.context.layout.scrollTop = Math.min(
      this.context.layout.scrollTop,
      this.context.layout.maxScrollY,
    );

    this.context.layout.refreshViewport();

    this.context.layout.hsbThumbX = this.context.layout.calculateHorizontalScrollbarThumbX();
    this.context.layout.vsbThumbY = this.context.layout.calculateVerticalScrollbarThumbY();

    const columnDef = this.context.props.columnDefs[columnIndex];
    this.context.props.onResizeColumn?.(columnDef.key, columnIndex, columnWidth);
  }

  private doColumnResizer(columnIndex: number) {
    const { props } = this.context;
    const { headAreaY, headAreaHeight } = this.context.layout;

    const initialResizerScrollX = this.context.layout.calculateResizerScrollX(columnIndex);
    let columnWasResized = false;

    const id = `column-resizer-${columnIndex}`;
    if (this.guictx.isActive(id)) {
      if (this.context.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        this.guictx.setActive(null);
      } else {
        this.dragColumnResizer(columnIndex);
        columnWasResized = true;
      }
    } else if (this.guictx.isHot(id)) {
      if (this.context.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        this.guictx.setActive(id);
        this.dragAnchorX = initialResizerScrollX + COLUMN_RESIZER_LEFT_WIDTH;
      }
    }

    let finalResizerScrollX: number;
    if (columnWasResized) {
      finalResizerScrollX = this.context.layout.calculateResizerScrollX(columnIndex);
    } else {
      finalResizerScrollX = initialResizerScrollX;
    }

    const x = this.context.layout.scrollToScreenX(finalResizerScrollX);
    const y = headAreaY;
    const width = COLUMN_RESIZER_WIDTH;
    const height = headAreaHeight - BORDER_WIDTH;

    const inside = this.context.platform.isMouseInRect(x, y, width, height);
    if (inside) {
      this.guictx.setHot(id);
    } else if (this.guictx.isHot(id)) {
      this.guictx.setHot(null);
    }

    if (this.guictx.isActive(id) || this.guictx.isHot(id)) {
      const { columnResizerColor } = props.theme;

      this.context.renderer.pushDrawCommand({
        type: 'rect',
        x,
        y,
        width,
        height,
        fillColor: columnResizerColor,
        clipRegion: this.headAreaClipRegion,
        sortOrder: 5,
      });
      return true;
    }

    return false;
  }

  private doHorizontalScrollbar() {
    const { props } = this.context;

    const { scrollbarBackgroundColor } = props.theme;
    if (scrollbarBackgroundColor) {
      const { hsbX, hsbY, hsbWidth, hsbHeight } = this.context.layout;
      this.context.renderer.pushDrawCommand({
        type: 'rect',
        x: hsbX,
        y: hsbY,
        width: hsbWidth,
        height: hsbHeight,
        fillColor: scrollbarBackgroundColor,
        sortOrder: 3,
      });
    }

    const id = 'horizontal-scrollbar-thumb';
    if (this.guictx.isActive(id)) {
      if (this.context.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        this.guictx.setActive(null);
      } else {
        this.dragHorizontalScrollbarThumb();
      }
    } else if (this.guictx.isHot(id)) {
      if (this.context.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        this.guictx.setActive(id);
        this.dragAnchorX = this.context.layout.hsbThumbX;
      }
    }

    const {
      hsbThumbX: x,
      hsbThumbY: y,
      hsbThumbWidth: width,
      hsbThumbHeight: height,
    } = this.context.layout;

    const inside = this.context.platform.isMouseInRect(x, y, width, height);
    if (inside) {
      this.guictx.setHot(id);
    } else if (this.guictx.isHot(id)) {
      this.guictx.setHot(null);
    }

    const { scrollbarThumbPressedColor, scrollbarThumbHoverColor, scrollbarThumbColor } =
      props.theme;

    let fillColor: string | undefined;
    if (this.guictx.isActive(id)) {
      fillColor = scrollbarThumbPressedColor;
    } else if (this.guictx.isHot(id)) {
      fillColor = scrollbarThumbHoverColor;
    } else {
      fillColor = scrollbarThumbColor;
    }

    if (fillColor) {
      this.context.renderer.pushDrawCommand({
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
    const { props } = this.context;

    const { scrollbarBackgroundColor } = props.theme;
    if (scrollbarBackgroundColor) {
      const { vsbX, vsbY, vsbWidth, vsbHeight } = this.context.layout;
      this.context.renderer.pushDrawCommand({
        type: 'rect',
        x: vsbX,
        y: vsbY,
        width: vsbWidth,
        height: vsbHeight,
        fillColor: scrollbarBackgroundColor,
        sortOrder: 3,
      });
    }

    const id = 'vertical-scrollbar-thumb';
    if (this.guictx.isActive(id)) {
      if (this.context.platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        this.guictx.setActive(null);
      } else {
        this.dragVerticalScrollbarThumb();
      }
    } else if (this.guictx.isHot(id)) {
      if (this.context.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        this.guictx.setActive(id);
        this.dragAnchorY = this.context.layout.vsbThumbY;
      }
    }

    const {
      vsbThumbX: x,
      vsbThumbY: y,
      vsbThumbWidth: width,
      vsbThumbHeight: height,
    } = this.context.layout;

    const inside = this.context.platform.isMouseInRect(x, y, width, height);
    if (inside) {
      this.guictx.setHot(id);
    } else if (this.guictx.isHot(id)) {
      this.guictx.setHot(null);
    }

    const { scrollbarThumbPressedColor, scrollbarThumbHoverColor, scrollbarThumbColor } =
      props.theme;

    let fillColor: string | undefined;
    if (this.guictx.isActive(id)) {
      fillColor = scrollbarThumbPressedColor;
    } else if (this.guictx.isHot(id)) {
      fillColor = scrollbarThumbHoverColor;
    } else {
      fillColor = scrollbarThumbColor;
    }

    if (fillColor) {
      this.context.renderer.pushDrawCommand({
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
    const { props } = this.context;
    const { rowHeight } = props.theme;
    const { bodyAreaX, bodyVisibleWidth, rowStart, rowEnd } = this.context.layout;

    if (this.hoveredRowIndex !== -1) {
      if (this.context.platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        const dataRow = props.dataRows[this.hoveredRowIndex];
        const dataRowId = props.selectId(dataRow);

        if (dataRowId !== props.selectedRowId) {
          props.selectedRowId = dataRowId;
          props.onSelectRow?.(dataRowId, dataRow);
        }
      }

      const { hoveredRowBackgroundColor } = props.theme;
      if (hoveredRowBackgroundColor && this.guictx.isNoneActive()) {
        this.context.renderer.pushDrawCommand({
          type: 'rect',
          x: bodyAreaX,
          y: this.context.layout.calculateRowScreenTop(this.hoveredRowIndex),
          width: bodyVisibleWidth,
          height: rowHeight,
          fillColor: hoveredRowBackgroundColor,
          clipRegion: this.bodyAreaClipRegion,
          sortOrder: 1,
        });
      }
    }

    if (props.selectedRowId !== null) {
      for (let i = rowStart; i < rowEnd; i++) {
        const dataRow = props.dataRows[i];
        const dataRowId = props.selectId(dataRow);

        if (props.selectedRowId == dataRowId) {
          const { selectedRowBackgroundColor } = props.theme;

          this.context.renderer.pushDrawCommand({
            type: 'rect',
            x: bodyAreaX,
            y: this.context.layout.calculateRowScreenTop(i),
            width: bodyVisibleWidth,
            height: rowHeight,
            fillColor: selectedRowBackgroundColor,
            clipRegion: this.bodyAreaClipRegion,
            sortOrder: 1,
          });
          break;
        }
      }
    }
  }

  private drawTableBackground() {
    const { canvasWidth, canvasHeight } = this.context.layout;
    const { tableBackgroundColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'rect',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      fillColor: tableBackgroundColor,
    });
  }

  private drawBodyBackground() {
    const { bodyAreaX, bodyAreaY, bodyAreaWidth, bodyAreaHeight } = this.context.layout;

    const { bodyBackgroundColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'rect',
      x: bodyAreaX,
      y: bodyAreaY,
      width: bodyAreaWidth,
      height: bodyAreaHeight,
      fillColor: bodyBackgroundColor,
    });
  }

  private drawHeadBackground() {
    const { headAreaX, headAreaY, headAreaWidth, headAreaHeight } = this.context.layout;

    const { headBackgroundColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'rect',
      x: headAreaX,
      y: headAreaY,
      width: headAreaWidth,
      height: headAreaHeight,
      fillColor: headBackgroundColor,
    });
  }

  private drawTopRightCornerBackground() {
    const { vsbX, vsbWidth } = this.context.layout;
    const { rowHeight, topRightCornerBackgroundColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'rect',
      x: vsbX,
      y: 0,
      width: vsbWidth,
      height: rowHeight,
      fillColor: topRightCornerBackgroundColor,
    });
  }

  private drawBottomRightCornerBackground() {
    const { hsbY, vsbX, vsbWidth } = this.context.layout;
    const { scrollbarThickness, bottomRightCornerBackgroundColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'rect',
      x: vsbX,
      y: hsbY,
      width: vsbWidth,
      height: scrollbarThickness,
      fillColor: bottomRightCornerBackgroundColor,
    });
  }

  private drawEvenRowsBackground() {
    const { bodyAreaX, gridWidth, rowStart, rowEnd } = this.context.layout;
    const { rowHeight, evenRowBackgroundColor } = this.context.props.theme;

    for (let i = rowStart; i < rowEnd; i += 2) {
      const y = this.context.layout.calculateRowScreenTop(i);
      this.context.renderer.pushDrawCommand({
        type: 'rect',
        x: bodyAreaX,
        y,
        width: gridWidth,
        height: rowHeight,
        fillColor: evenRowBackgroundColor,
        clipRegion: this.bodyAreaClipRegion,
      });
    }
  }

  private drawOddRowsBackground() {
    const { bodyAreaX, gridWidth, rowStart, rowEnd } = this.context.layout;
    const { rowHeight, oddRowBackgroundColor } = this.context.props.theme;

    for (let i = rowStart + 1; i < rowEnd; i += 2) {
      const y = this.context.layout.calculateRowScreenTop(i);
      this.context.renderer.pushDrawCommand({
        type: 'rect',
        x: bodyAreaX,
        y,
        width: gridWidth,
        height: rowHeight,
        fillColor: oddRowBackgroundColor,
        clipRegion: this.bodyAreaClipRegion,
      });
    }
  }

  private drawHeadBottomBorder() {
    const { canvasWidth, headAreaY, headAreaHeight } = this.context.layout;
    const { borderColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: headAreaY + headAreaHeight - 1,
      length: canvasWidth,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawHorizontalScrollbarBorder() {
    const { canvasWidth, hsbY } = this.context.layout;
    const { borderColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: hsbY,
      length: canvasWidth,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawVerticalScrollbarBorder() {
    const { canvasHeight, vsbX } = this.context.layout;
    const { borderColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: vsbX,
      y: 0,
      length: canvasHeight,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawRightTableContentBorder() {
    const { tableAreaX, tableAreaY, gridWidth, gridHeight } = this.context.layout;
    const { borderColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: tableAreaX + gridWidth,
      y: tableAreaY,
      length: gridHeight,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawBottomTableContentBorder() {
    const { tableAreaX, tableAreaY, gridWidth, gridHeight } = this.context.layout;
    const { borderColor } = this.context.props.theme;

    this.context.renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: tableAreaX,
      y: tableAreaY + gridHeight,
      length: gridWidth,
      color: borderColor,
      sortOrder: 4,
    });
  }

  private drawRowBorders() {
    const { bodyAreaX, gridWidth, rowStart, rowEnd } = this.context.layout;
    const { borderColor } = this.context.props.theme;

    for (let rowIndex = rowStart; rowIndex < rowEnd - 1; rowIndex++) {
      this.context.renderer.pushDrawCommand({
        type: 'line',
        orientation: 'horizontal',
        x: bodyAreaX,
        y: this.context.layout.calculateRowScreenBottom(rowIndex) - 1,
        length: gridWidth,
        color: borderColor,
        sortOrder: 4,
      });
    }
  }

  private drawColumnBorders() {
    const { tableAreaY, gridHeight, columnStart, columnEnd } = this.context.layout;
    const { borderColor } = this.context.props.theme;

    for (let columnIndex = columnStart; columnIndex < columnEnd - 1; columnIndex++) {
      this.context.renderer.pushDrawCommand({
        type: 'line',
        orientation: 'vertical',
        x: this.context.layout.calculateColumnScreenRight(columnIndex) - 1,
        y: tableAreaY,
        length: gridHeight,
        color: borderColor,
        sortOrder: 4,
      });
    }
  }

  private drawHeadText() {
    const { columnDefs, theme } = this.context.props;
    const { columnWidths, columnStart, columnEnd } = this.context.layout;

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

    const { textRenderer } = this.context.renderer;

    const textStyle = headFontStyle ?? fontStyle;
    const font = createFontSpecifier(fontFamily, fontSize, textStyle);

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } =
      this.context.platform.getFontMetrics(font);

    const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
    const baselineY = Math.floor((rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

    const textColor = headFontColor ?? fontColor;

    for (let j = columnStart; j < columnEnd; j++) {
      const columnDef = columnDefs[j];
      const columnWidth = columnWidths[j];

      const columnPos = this.context.layout.calculateColumnScreenLeft(j);

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

      this.context.renderer.pushDrawCommand({
        type: 'text',
        chars,
        subpixelOffsets,
        x,
        y,
        font,
        color: textColor,
        clipRegion: this.headAreaClipRegion,
        sortOrder: 2,
      });
    }
  }

  private drawBodyText() {
    const { columnDefs, dataRows, theme, selectProp } = this.context.props;
    const { columnWidths, rowStart, rowEnd, columnStart, columnEnd } = this.context.layout;

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

    const { textRenderer } = this.context.renderer;

    const textStyle = bodyFontStyle ?? fontStyle;
    const font = createFontSpecifier(fontFamily, fontSize, textStyle);

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } =
      this.context.platform.getFontMetrics(font);

    const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
    const baselineY = Math.floor((rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

    const textColor = bodyFontColor ?? fontColor;

    for (let j = columnStart; j < columnEnd; j++) {
      const columnDef = columnDefs[j];
      const columnWidth = columnWidths[j];

      const columnPos = this.context.layout.calculateColumnScreenLeft(j);

      const x = columnPos + cellPadding;
      const maxWidth = columnWidth - cellPadding * 2;

      for (let i = rowStart; i < rowEnd; i++) {
        const dataRow = dataRows[i];

        const rowPos = this.context.layout.calculateRowScreenTop(i);
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

        this.context.renderer.pushDrawCommand({
          type: 'text',
          chars,
          subpixelOffsets,
          x,
          y,
          font,
          color: textColor,
          clipRegion: this.bodyAreaClipRegion,
          sortOrder: 2,
        });
      }
    }
  }

  private updateClipRegions() {
    this.bodyAreaClipRegion = new Path2D();
    this.bodyAreaClipRegion.rect(
      this.context.layout.bodyAreaX,
      this.context.layout.bodyAreaY,
      this.context.layout.bodyAreaWidth,
      this.context.layout.bodyAreaHeight,
    );

    this.headAreaClipRegion = new Path2D();
    this.headAreaClipRegion.rect(
      this.context.layout.headAreaX,
      this.context.layout.headAreaY,
      this.context.layout.headAreaWidth,
      this.context.layout.headAreaHeight,
    );
  }

  private calculateColumnWidths(columnDefs: ColumnDef[]) {
    const columnWidths = [] as number[];
    for (const { width } of columnDefs) {
      columnWidths.push(width ?? DEFAULT_COLUMN_WIDTH);
    }
    return columnWidths;
  }
}

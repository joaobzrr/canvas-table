import { type Context } from './Context';
import { GuiContext } from './GuiContext';
import { isNumber, clamp, createFontSpecifier } from './utils';
import {
  BORDER_WIDTH,
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  MIN_COLUMN_WIDTH,
  MOUSE_BUTTONS,
} from './constants';

export type GuiParams = {
  context: Context;
};

export class Gui {
  private ctx: Context;
  private guiCtx: GuiContext;

  private hoveredRowIndex = -1;

  private dragAddendX = 0;
  private dragAddendY = 0;

  private headAreaClipRegion: Path2D = undefined!;
  private bodyAreaClipRegion: Path2D = undefined!;

  constructor(params: GuiParams) {
    this.ctx = params.context;
    this.guiCtx = new GuiContext();
  }

  public update() {
    const { layout, renderer } = this.ctx;
    const { theme } = this.ctx.props;

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

    renderer.render();
  }

  public prepareFrame() {
    const { platform, layout, props } = this.ctx;
    const { theme } = props;

    layout.reflow();

    let scrollAmountX: number;
    let scrollAmountY: number;
    if (this.guiCtx.isNoneActive()) {
      scrollAmountX = platform.scrollAmountX;
      scrollAmountY = platform.scrollAmountY;
    } else {
      scrollAmountX = 0;
      scrollAmountY = 0;
    }

    layout.updateScrollPos(scrollAmountX, scrollAmountY);
    layout.updateViewport();

    const shouldSetContainerBorder =
      (theme.outerBorder !== undefined && theme.outerBorder) ||
      (theme.outerBorder === undefined && theme.border);
    if (shouldSetContainerBorder) {
      platform.setContainerBorder(theme.borderColor);
    }

    if (platform.isMouseMoved()) {
      this.hoveredRowIndex = this.calculateHoveredRowIndex();
    }

    this.updateClipRegions();
  }

  private doColumnResizer(columnIndex: number) {
    const { platform, renderer, layout, props } = this.ctx;
    const { theme } = props;

    const id = `column-resizer-${columnIndex}`;

    if (this.guiCtx.isActive(id)) {
      if (platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        this.guiCtx.setActive(null);
      } else {
        this.dragColumnResizer(columnIndex);
      }
    } else if (this.guiCtx.isHot(id)) {
      if (platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        this.guiCtx.setActive(id);
        this.dragAddendX = layout.columnWidths[columnIndex];
      }
    }

    const resizerScrollX = this.calculateResizerScrollX(columnIndex);
    const x = layout.scrollToScreenX(resizerScrollX);
    const y = layout.headAreaY;
    const width = COLUMN_RESIZER_WIDTH;
    const height = layout.headAreaHeight - BORDER_WIDTH;

    const inside = platform.isMouseInRect(x, y, width, height);
    if (inside) {
      this.guiCtx.setHot(id);
    } else if (this.guiCtx.isHot(id)) {
      this.guiCtx.setHot(null);
    }

    if (this.guiCtx.isActive(id) || this.guiCtx.isHot(id)) {
      renderer.pushDrawCommand({
        type: 'rect',
        x,
        y,
        width,
        height,
        fillColor: theme.columnResizerColor,
        clipRegion: this.headAreaClipRegion,
        sortOrder: 5,
      });

      return true;
    }

    return false;
  }

  public dragColumnResizer(columnIndex: number) {
    const { platform, layout, props } = this.ctx;

    const computedColumnWidth = this.dragAddendX + platform.dragDistanceX;
    const newColumnWidth = Math.max(computedColumnWidth, MIN_COLUMN_WIDTH);
    layout.resizeColumn(columnIndex, newColumnWidth);

    const columnDef = props.columnDefs[columnIndex];
    props.onResizeColumn?.(columnDef.key, columnIndex, newColumnWidth);
  }

  private doHorizontalScrollbar() {
    const { platform, renderer, layout, props } = this.ctx;
    const { theme } = props;

    if (theme.scrollbarBackgroundColor) {
      renderer.pushDrawCommand({
        type: 'rect',
        x: layout.hsbX,
        y: layout.hsbY,
        width: layout.hsbWidth,
        height: layout.hsbHeight,
        fillColor: theme.scrollbarBackgroundColor,
        sortOrder: 3,
      });
    }

    const id = 'horizontal-scrollbar-thumb';

    if (this.guiCtx.isActive(id)) {
      if (platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        this.guiCtx.setActive(null);
      } else {
        this.dragHorizontalScrollbarThumb();
      }
    } else if (this.guiCtx.isHot(id)) {
      if (platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        this.guiCtx.setActive(id);
        this.dragAddendX = layout.hsbThumbX;
      }
    }

    const inside = platform.isMouseInRect(
      layout.hsbThumbX,
      layout.hsbThumbY,
      layout.hsbThumbWidth,
      layout.hsbThumbHeight,
    );
    if (inside) {
      this.guiCtx.setHot(id);
    } else if (this.guiCtx.isHot(id)) {
      this.guiCtx.setHot(null);
    }

    let fillColor: string | undefined;
    if (this.guiCtx.isActive(id)) {
      fillColor = theme.scrollbarThumbPressedColor;
    } else if (this.guiCtx.isHot(id)) {
      fillColor = theme.scrollbarThumbHoverColor;
    } else {
      fillColor = theme.scrollbarThumbColor;
    }

    if (fillColor) {
      renderer.pushDrawCommand({
        type: 'rect',
        x: layout.hsbThumbX,
        y: layout.hsbThumbY,
        width: layout.hsbThumbWidth,
        height: layout.hsbThumbHeight,
        fillColor: fillColor,
        sortOrder: 4,
      });
    }
  }

  public dragHorizontalScrollbarThumb() {
    const { platform, layout } = this.ctx;

    layout.hsbThumbX = clamp(
      this.dragAddendX + platform.dragDistanceX,
      layout.hsbThumbMinX,
      layout.hsbThumbMaxX,
    );
    layout.scrollLeft = layout.calculateScrollX(layout.hsbThumbX);

    layout.updateViewport();
  }

  private doVerticalScrollbar() {
    const { platform, renderer, layout, props } = this.ctx;
    const { theme } = props;

    if (theme.scrollbarBackgroundColor) {
      renderer.pushDrawCommand({
        type: 'rect',
        x: layout.vsbX,
        y: layout.vsbY,
        width: layout.vsbWidth,
        height: layout.vsbHeight,
        fillColor: theme.scrollbarBackgroundColor,
        sortOrder: 3,
      });
    }

    const id = 'vertical-scrollbar-thumb';

    if (this.guiCtx.isActive(id)) {
      if (platform.isMouseReleased(MOUSE_BUTTONS.PRIMARY)) {
        this.guiCtx.setActive(null);
      } else {
        this.dragVerticalScrollbarThumb();
      }
    } else if (this.guiCtx.isHot(id)) {
      if (platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        this.guiCtx.setActive(id);
        this.dragAddendY = layout.vsbThumbY;
      }
    }
    const inside = platform.isMouseInRect(
      layout.vsbThumbX,
      layout.vsbThumbY,
      layout.vsbThumbWidth,
      layout.vsbThumbHeight,
    );
    if (inside) {
      this.guiCtx.setHot(id);
    } else if (this.guiCtx.isHot(id)) {
      this.guiCtx.setHot(null);
    }

    let fillColor: string | undefined;
    if (this.guiCtx.isActive(id)) {
      fillColor = theme.scrollbarThumbPressedColor;
    } else if (this.guiCtx.isHot(id)) {
      fillColor = theme.scrollbarThumbHoverColor;
    } else {
      fillColor = theme.scrollbarThumbColor;
    }

    if (fillColor) {
      renderer.pushDrawCommand({
        type: 'rect',
        x: layout.vsbThumbX,
        y: layout.vsbThumbY,
        width: layout.vsbThumbWidth,
        height: layout.vsbThumbHeight,
        fillColor: fillColor,
        sortOrder: 4,
      });
    }
  }

  public dragVerticalScrollbarThumb() {
    const { platform, layout } = this.ctx;

    layout.vsbThumbY = clamp(
      this.dragAddendY + platform.dragDistanceY,
      layout.vsbThumbMinY,
      layout.vsbThumbMaxY,
    );
    layout.scrollTop = layout.calculateScrollY(layout.vsbThumbY);

    layout.updateViewport();
  }

  private doRows() {
    const { platform, layout, renderer, props } = this.ctx;
    const { theme } = props;

    if (this.hoveredRowIndex !== -1) {
      if (platform.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
        const dataRow = props.dataRows[this.hoveredRowIndex];
        const dataRowId = props.selectId(dataRow);

        if (dataRowId !== props.selectedRowId) {
          props.selectedRowId = dataRowId;
          props.onSelectRow?.(dataRowId, dataRow);
        }
      }

      if (theme.hoveredRowBackgroundColor && this.guiCtx.isNoneActive()) {
        renderer.pushDrawCommand({
          type: 'rect',
          x: layout.bodyAreaX,
          y: layout.calculateRowScreenTop(this.hoveredRowIndex),
          width: layout.bodyVisibleWidth,
          height: theme.rowHeight,
          fillColor: theme.hoveredRowBackgroundColor,
          clipRegion: this.bodyAreaClipRegion,
          sortOrder: 1,
        });
      }
    }

    if (props.selectedRowId !== null) {
      for (let i = layout.rowStart; i < layout.rowEnd; i++) {
        const dataRow = props.dataRows[i];
        const dataRowId = props.selectId(dataRow);

        if (props.selectedRowId == dataRowId) {
          renderer.pushDrawCommand({
            type: 'rect',
            x: layout.bodyAreaX,
            y: layout.calculateRowScreenTop(i),
            width: layout.bodyVisibleWidth,
            height: theme.rowHeight,
            fillColor: theme.selectedRowBackgroundColor,
            clipRegion: this.bodyAreaClipRegion,
            sortOrder: 1,
          });
          break;
        }
      }
    }
  }

  private drawTableBackground() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'rect',
      x: 0,
      y: 0,
      width: layout.canvasWidth,
      height: layout.canvasHeight,
      fillColor: theme.tableBackgroundColor,
    });
  }

  private drawBodyBackground() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'rect',
      x: layout.bodyAreaX,
      y: layout.bodyAreaY,
      width: layout.bodyAreaWidth,
      height: layout.bodyAreaHeight,
      fillColor: theme.bodyBackgroundColor,
    });
  }

  private drawHeadBackground() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'rect',
      x: layout.headAreaX,
      y: layout.headAreaY,
      width: layout.headAreaWidth,
      height: layout.headAreaHeight,
      fillColor: theme.headBackgroundColor,
    });
  }

  private drawTopRightCornerBackground() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'rect',
      x: layout.vsbX,
      y: 0,
      width: layout.vsbWidth,
      height: theme.rowHeight,
      fillColor: theme.topRightCornerBackgroundColor,
    });
  }

  private drawBottomRightCornerBackground() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'rect',
      x: layout.vsbX,
      y: layout.hsbY,
      width: layout.vsbWidth,
      height: theme.scrollbarThickness,
      fillColor: theme.bottomRightCornerBackgroundColor,
    });
  }

  private drawEvenRowsBackground() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    for (let i = layout.rowStart; i < layout.rowEnd; i += 2) {
      const y = layout.calculateRowScreenTop(i);
      renderer.pushDrawCommand({
        type: 'rect',
        x: layout.bodyAreaX,
        y,
        width: layout.gridWidth,
        height: theme.rowHeight,
        fillColor: theme.evenRowBackgroundColor,
        clipRegion: this.bodyAreaClipRegion,
      });
    }
  }

  private drawOddRowsBackground() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    for (let i = layout.rowStart + 1; i < layout.rowEnd; i += 2) {
      const y = layout.calculateRowScreenTop(i);
      renderer.pushDrawCommand({
        type: 'rect',
        x: layout.bodyAreaX,
        y,
        width: layout.gridWidth,
        height: theme.rowHeight,
        fillColor: theme.oddRowBackgroundColor,
        clipRegion: this.bodyAreaClipRegion,
      });
    }
  }

  private drawHeadBottomBorder() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: layout.headAreaY + layout.headAreaHeight - 1,
      length: layout.canvasWidth,
      color: theme.borderColor,
      sortOrder: 4,
    });
  }

  private drawHorizontalScrollbarBorder() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: 0,
      y: layout.hsbY,
      length: layout.canvasWidth,
      color: theme.borderColor,
      sortOrder: 4,
    });
  }

  private drawVerticalScrollbarBorder() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: layout.vsbX,
      y: 0,
      length: layout.canvasHeight,
      color: theme.borderColor,
      sortOrder: 4,
    });
  }

  private drawRightTableContentBorder() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'line',
      orientation: 'vertical',
      x: layout.tableAreaX + layout.gridWidth,
      y: layout.tableAreaY,
      length: layout.gridHeight,
      color: theme.borderColor,
      sortOrder: 4,
    });
  }

  private drawBottomTableContentBorder() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    renderer.pushDrawCommand({
      type: 'line',
      orientation: 'horizontal',
      x: layout.tableAreaX,
      y: layout.tableAreaY + layout.gridHeight,
      length: layout.gridWidth,
      color: theme.borderColor,
      sortOrder: 4,
    });
  }

  private drawRowBorders() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    for (let i = layout.rowStart; i < layout.rowEnd - 1; i++) {
      renderer.pushDrawCommand({
        type: 'line',
        orientation: 'horizontal',
        x: layout.bodyAreaX,
        y: layout.calculateRowScreenBottom(i) - 1,
        length: layout.gridWidth,
        color: theme.borderColor,
        sortOrder: 4,
      });
    }
  }

  private drawColumnBorders() {
    const { renderer, layout, props } = this.ctx;
    const { theme } = props;

    for (let j = layout.columnStart; j < layout.columnEnd - 1; j++) {
      renderer.pushDrawCommand({
        type: 'line',
        orientation: 'vertical',
        x: layout.calculateColumnScreenRight(j) - 1,
        y: layout.tableAreaY,
        length: layout.gridHeight,
        color: theme.borderColor,
        sortOrder: 4,
      });
    }
  }

  private drawHeadText() {
    const { platform, renderer, layout, props } = this.ctx;
    const { theme } = props;

    const textStyle = theme.headFontStyle ?? theme.fontStyle;
    const font = createFontSpecifier(theme.fontFamily, theme.fontSize, textStyle);

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } = platform.getFontMetrics(font);

    const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
    const baselineY = Math.floor((theme.rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

    const textColor = theme.headFontColor ?? theme.fontColor;

    for (let j = layout.columnStart; j < layout.columnEnd; j++) {
      const columnDef = props.columnDefs[j];
      const columnWidth = layout.columnWidths[j];

      const columnPos = layout.calculateColumnScreenLeft(j);

      const x = columnPos + theme.cellPadding;
      const y = baselineY;

      const maxWidth = columnWidth - theme.cellPadding * 2;
      const text = columnDef.title;

      const { chars, subpixelOffsets } = renderer.textRenderer.prepareText(
        text,
        x,
        font,
        textColor,
        maxWidth,
        true,
      );

      renderer.pushDrawCommand({
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
    const { platform, renderer, layout, props } = this.ctx;
    const { theme } = props;

    const textStyle = theme.bodyFontStyle ?? theme.fontStyle;
    const font = createFontSpecifier(theme.fontFamily, theme.fontSize, textStyle);

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } = platform.getFontMetrics(font);

    const fontHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;
    const baselineY = Math.floor((theme.rowHeight - fontHeight) / 2 + fontBoundingBoxAscent);

    const textColor = theme.bodyFontColor ?? theme.fontColor;

    for (let j = layout.columnStart; j < layout.columnEnd; j++) {
      const columnDef = props.columnDefs[j];
      const columnWidth = layout.columnWidths[j];

      const columnPos = layout.calculateColumnScreenLeft(j);

      const x = columnPos + theme.cellPadding;
      const maxWidth = columnWidth - theme.cellPadding * 2;

      for (let i = layout.rowStart; i < layout.rowEnd; i++) {
        const dataRow = props.dataRows[i];

        const rowPos = layout.calculateRowScreenTop(i);
        const y = rowPos + baselineY;

        const value = props.selectProp(dataRow, columnDef);
        const text = isNumber(value) ? value.toString() : (value as string);

        const { chars, subpixelOffsets } = renderer.textRenderer.prepareText(
          text,
          x,
          font,
          textColor,
          maxWidth,
          true,
        );

        renderer.pushDrawCommand({
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

  public calculateResizerScrollX(columnIndex: number) {
    const { layout } = this.ctx;

    const columnScrollLeft = layout.calculateColumnScrollLeft(columnIndex);

    const columnWidth = layout.columnWidths[columnIndex];
    const columnScrollRight = columnScrollLeft + columnWidth;

    const resizerScrollLeft = Math.min(
      columnScrollRight - COLUMN_RESIZER_LEFT_WIDTH - 1,
      layout.scrollWidthMinCapped - COLUMN_RESIZER_WIDTH,
    );
    return resizerScrollLeft;
  }

  public calculateHoveredRowIndex() {
    const { platform, layout, props } = this.ctx;
    const { theme } = props;

    let mouseRow: number;
    if (
      platform.isMouseInRect(
        layout.bodyAreaX,
        layout.bodyAreaY,
        layout.bodyAreaWidth,
        layout.bodyAreaHeight,
      )
    ) {
      mouseRow = Math.floor(layout.screenToScrollY(platform.currMouseY) / theme.rowHeight);
    } else {
      mouseRow = -1;
    }

    return mouseRow;
  }

  private updateClipRegions() {
    const { layout } = this.ctx;

    this.bodyAreaClipRegion = new Path2D();
    this.bodyAreaClipRegion.rect(
      layout.bodyAreaX,
      layout.bodyAreaY,
      layout.bodyAreaWidth,
      layout.bodyAreaHeight,
    );

    this.headAreaClipRegion = new Path2D();
    this.headAreaClipRegion.rect(
      layout.headAreaX,
      layout.headAreaY,
      layout.headAreaWidth,
      layout.headAreaHeight,
    );
  }
}

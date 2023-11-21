import { TableContext } from "./lib/TableContext";
import { Stage } from "./lib/Stage";
import { Renderer } from "./lib/Renderer";
import { UiContext, UiId } from "./lib/UiContext";
import { scale, clamp, isNumber, createVector, createFontSpecifier, getFontMetrics } from "./utils";
import {
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  MIN_COLUMN_WIDTH,
  RENDER_LAYER_1,
  RENDER_LAYER_2,
  RENDER_LAYER_3,
  SELECTED_CELL_BORDER_WIDTH
} from "./constants";
import { DraggableProps, Vector } from "./types";

export class Controller {
  tblctx: TableContext;
  renderer: Renderer;
  ui: UiContext;

  constructor(tblctx: TableContext) {
    this.tblctx = tblctx;
    this.renderer = new Renderer();
    this.ui = new UiContext();
  }

  update() {
    const { props, state, theme, stage, layout } = this.tblctx;

    {
      let newScrollX = layout.scrollX;
      let newScrollY = layout.scrollY;

      if (!this.ui.isAnyActive()) {
        newScrollX += stage.scrollAmountX;
        newScrollY += stage.scrollAmountY;
      }

      newScrollX = clamp(newScrollX, 0, layout.maxScrollX);
      newScrollY = clamp(newScrollY, 0, layout.maxScrollY);
      if (newScrollX !== layout.scrollX || newScrollY !== layout.scrollY) {
        layout.scrollTo(newScrollX, newScrollY);
      }
    }

    let mouseCol = -1;
    let mouseRow = -1;

    if (this.isMouseInBody()) {
      const { rowHeight } = theme;

      for (const columnIndex of layout.colRange()) {
        const columnWidth = state.columnWidths[columnIndex];

        const screenColumnLeft = layout.getScreenColPos(columnIndex);
        const screenColumnRight = screenColumnLeft + columnWidth;
        if (stage.currMouseX >= screenColumnLeft && stage.currMouseX < screenColumnRight) {
          mouseCol = columnIndex;
          break;
        }
      }

      mouseRow = Math.floor(
        (layout.screenToCanonicalY(stage.currMouseY) - rowHeight) / rowHeight
      );
    }

    const ctx = stage.getContext();
    const stageSize = stage.getSize();

    if (theme.tableBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        x: 0,
        y: 0,
        width: stageSize.width,
        height: stageSize.height,
        fillColor: theme.tableBackgroundColor
      });
    }

    if (theme.bodyBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        fillColor: theme.bodyBackgroundColor,
        x: layout.bodyAreaX,
        y: layout.bodyAreaY,
        width: layout.bodyAreaWidth,
        height: layout.bodyAreaHeight
      });
    }

    if (theme.headerBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        fillColor: theme.headerBackgroundColor,
        x: layout.headerAreaX,
        y: layout.headerAreaY,
        width: layout.headerAreaWidth,
        height: layout.headerAreaHeight
      });
    }

    this.doColumnResizer(); 

    if (layout.overflowX) {
      if (theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          x: layout.hsbX,
          y: layout.hsbY,
          width: layout.hsbWidth,
          height: layout.hsbHeight,
          fillColor: theme.scrollbarTrackColor
        });
      }

      this.doDraggable({
        id: UiContext.createId("horizontal-scrollbar-thumb"),
        x: layout.hsbThumbX,
        y: layout.hsbThumbY,
        width: layout.hsbThumbWidth,
        height: layout.hsbThumbHeight,
        onDrag: (_id, pos) => this.onDragHorizontalScrollbar(pos),
        activeColor: theme.scrollbarThumbPressedColor,
        hotColor: theme.scrollbarThumbHoverColor,
        color: theme.scrollbarThumbColor,
        sortOrder: RENDER_LAYER_3
      });
    }

    if (layout.overflowY) {
      if (theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          x: layout.vsbX,
          y: layout.vsbY,
          width: layout.vsbWidth,
          height: layout.vsbHeight,
          fillColor: theme.scrollbarTrackColor
        });
      }

      this.doDraggable({
        id: UiContext.createId("vertical-scrollbar-thumb"),
        x: layout.vsbThumbX,
        y: layout.vsbThumbY,
        width: layout.vsbThumbWidth,
        height: layout.vsbThumbHeight,
        onDrag: (_id, pos) => this.onDragVerticalScrollbar(pos),
        activeColor: theme.scrollbarThumbPressedColor,
        hotColor: theme.scrollbarThumbHoverColor,
        color: theme.scrollbarThumbColor,
        sortOrder: RENDER_LAYER_3
      });
    }

    if (mouseRow !== -1) {
      const dataRow = props.dataRows[mouseRow];
      if (stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        const dataRowId = props.selectId(dataRow);
        if (dataRowId !== state.selectedRowId) {
          state.selectedRowId = dataRowId;
          state.selectedColIndex = -1;

          this.tblctx.emit("selrowchange", dataRowId, dataRow);
        }
      }

      if (!this.ui.isAnyActive() && theme.hoveredRowColor) {
        const rowRect = this.calculateRowRect(mouseRow);
        const clipRegion = this.bodyAreaPath();
        this.renderer.submit({
          type: "rect",
          fillColor: theme.hoveredRowColor,
          clipRegion,
          ...rowRect
        });
      }

      if (mouseCol !== -1) {
        if (stage.isMouseDoubleClicked(Stage.MOUSE_BUTTONS.PRIMARY)) {
          state.selectedRowIndex = mouseRow;
          state.selectedColIndex = mouseCol;

          layout.scrollSuchThatCellIsVisible(mouseRow, mouseCol);
          this.tblctx.emit("dblclickcell", mouseRow, mouseCol);
        }
      }
    }

    if (state.selectedRowIndex !== -1 && state.selectedColIndex !== -1) {
      const screenColPosition = layout.getScreenColPos(state.selectedColIndex);
      const screenRowPosition = layout.getScreenRowPos(state.selectedRowIndex);

      const columnWidth = state.columnWidths[state.selectedColIndex];

      const clipRegion = this.bodyAreaPath();

      this.renderer.submit({
        type: "rect",
        x: screenColPosition,
        y: screenRowPosition,
        width: columnWidth,
        height: theme.rowHeight,
        strokeColor: theme.selectedCellBorderColor,
        strokeWidth: SELECTED_CELL_BORDER_WIDTH,
        clipRegion,
        sortOrder: RENDER_LAYER_2
      });
    }

    if (state.selectedRowId !== null) {
      const clipRegion = this.bodyAreaPath();

      for (const rowIndex of layout.rowRange()) {
        const dataRow = props.dataRows[rowIndex];
        const dataRowId = props.selectId(dataRow);

        if (state.selectedRowId === dataRowId) {
          const rect = this.calculateRowRect(rowIndex);

          this.renderer.submit({
            type: "rect",
            fillColor: theme.selectedRowColor,
            clipRegion: clipRegion,
            ...rect
          });

          break;
        }
      }
    }

    // Draw outer canvas border
    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: 0,
      length: stageSize.width,
      color: theme.tableBorderColor,
      sortOrder: RENDER_LAYER_1
    });

    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: stageSize.height - 1,
      length: stageSize.width,
      color: theme.tableBorderColor,
      sortOrder: RENDER_LAYER_1
    });

    this.renderer.submit({
      type: "line",
      orientation: "vertical",
      x: 0,
      y: 0,
      length: stageSize.height,
      color: theme.tableBorderColor,
      sortOrder: RENDER_LAYER_1
    });

    this.renderer.submit({
      type: "line",
      orientation: "vertical",
      x: stageSize.width - 1,
      y: 0,
      length: stageSize.height,
      color: theme.tableBorderColor,
      sortOrder: RENDER_LAYER_1
    });

    const gridWidth  = layout.bodyWidth;
    const gridHeight = layout.bodyHeight + theme.rowHeight;

    // Draw header bottom border
    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: theme.rowHeight,
      length: stageSize.width,
      color: theme.tableBorderColor,
      sortOrder: RENDER_LAYER_1
    });

    // If horizontal scrollbar is visible, draw its border, otherwise,
    // draw table content right border
    if (layout.overflowX) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: layout.hsbY - 1,
        length: stageSize.width,
        color: theme.tableBorderColor,
        sortOrder: RENDER_LAYER_1
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: gridWidth,
        y: 0,
        length: gridHeight,
        color: theme.tableBorderColor,
        sortOrder: RENDER_LAYER_1
      });
    }

    // If vertical scrollbar is visible, draw its border, otherwise,
    // draw table content bottom border
    if (layout.overflowY) {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: layout.vsbX - 1,
        y: 0,
        length: stageSize.height,
        color: theme.tableBorderColor,
        sortOrder: RENDER_LAYER_1
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: gridHeight,
        length: gridWidth,
        color: theme.tableBorderColor,
        sortOrder: RENDER_LAYER_1
      });
    }

    // Draw grid horizontal lines
    for (const rowIndex of layout.rowRange(1)) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: layout.getScreenRowPos(rowIndex),
        length: gridWidth,
        color: theme.tableBorderColor,
        sortOrder: RENDER_LAYER_1
      });
    }

    // Draw grid vertical lines
    for (const columnIndex of layout.colRange(1)) {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: layout.getScreenColPos(columnIndex),
        y: 0,
        length: gridHeight,
        color: theme.tableBorderColor,
        sortOrder: RENDER_LAYER_1
      });
    }

    {
      const { columnDefs } = props;
      const { columnWidths } = state;

      const {
        rowHeight,
        cellPadding,
        fontFamily,
        fontSize,
        fontStyle,
        headerFontStyle,
        fontColor,
        headerFontColor
      } = theme;

      const actualFontStyle = headerFontStyle ?? fontStyle;
      const font = createFontSpecifier(fontFamily, fontSize, actualFontStyle);

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBounginxBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const actualFontColor = headerFontColor ?? fontColor;

      const clipRegion = this.headerAreaPath();

      for (const columnIndex of layout.colRange()) {
        const columnDef = columnDefs[columnIndex];
        const columnWidth = columnWidths[columnIndex];

        const screenColumnPos = layout.getScreenColPos(columnIndex);

        const xOffset = cellPadding + SELECTED_CELL_BORDER_WIDTH;
        const x = screenColumnPos + xOffset;
        const y = rowHeight / 2 + halfFontBounginxBoxAscent;
        const maxWidth = columnWidth - xOffset * 2;
        const text = columnDef.title;

        this.renderer.submit({
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
      const { columnDefs, dataRows } = props;
      const { columnWidths } = state;

      const {
        rowHeight,
        cellPadding,
        fontFamily,
        fontSize,
        fontStyle,
        bodyFontStyle,
        fontColor,
        bodyFontColor
      } = theme;

      const actualFontStyle = bodyFontStyle ?? fontStyle;
      const font = createFontSpecifier(fontFamily, fontSize, actualFontStyle);

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBoundingBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const actualFontColor = bodyFontColor ?? fontColor;

      const clipRegion = this.bodyAreaPath();

      for (const columnIndex of layout.colRange()) {
        const columnDef = columnDefs[columnIndex];
        const columnWidth = columnWidths[columnIndex];

        const screenColumnPos = layout.getScreenColPos(columnIndex);

        const xOffset = cellPadding + SELECTED_CELL_BORDER_WIDTH;
        const x = screenColumnPos + xOffset;
        const maxWidth = columnWidth - xOffset;

        for (const rowIndex of layout.rowRange()) {
          const dataRow = dataRows[rowIndex];

          const screenRowPos = layout.getScreenRowPos(rowIndex);

          const y = screenRowPos + rowHeight / 2 + halfFontBoundingBoxAscent;

          const value = props.selectProp(dataRow, columnDef.key);
          const text = isNumber(value) ? value.toString() : (value as string);

          this.renderer.submit({
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
    }

    this.renderer.render(ctx, stageSize);
  }

  doColumnResizer() {
    const { layout } = this.tblctx;

    const clipRegion = this.headerAreaPath();

    if (this.ui.isActive("column-resizer")) {
      this.doOneColumnResizer(this.ui.active!, clipRegion);
      return;
    }

    for (const columnIndex of layout.colRange()) {
      const id = UiContext.createId("column-resizer", columnIndex);
      this.doOneColumnResizer(id, clipRegion);
    }
  }

  doOneColumnResizer(id: UiId, clipRegion: Path2D) {
    const { columnResizerColor } = this.tblctx.theme;

    const columnIndex = id.index!;
    const rect = this.calculateColumnResizerRect(columnIndex);

    this.doDraggable({
      id,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      onDrag: (id, pos) => this.onDragColumnResizer(id, pos),
      activeColor: columnResizerColor,
      hotColor: columnResizerColor,
      sortOrder: RENDER_LAYER_3,
      clipRegion
    });
  }

  doDraggable(props: DraggableProps) {
    const { stage } = this.tblctx;

    if (this.ui.isActive(props.id)) {
      if (stage.isMouseReleased(Stage.MOUSE_BUTTONS.PRIMARY)) {
        // @Todo Move this to a separate function
        if (this.ui.active && this.ui.active.name === props.id.name) {
          this.ui.active = null;
        }
      } else {
        const pos = createVector(
          stage.dragAnchorX + stage.dragDistanceX,
          stage.dragAnchorY + stage.dragDistanceY
        );

        if (props.onDrag) {
          props.onDrag(props.id, pos);
        }

        props.x = pos.x;
        props.y = pos.y;
      }
    } else if (this.ui.isHot(props.id)) {
      if (stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        this.ui.setAsActive(props.id);

        stage.dragAnchorX = props.x;
        stage.dragAnchorY = props.y;
      }
    }
    const inside = stage.isMouseInRect(props.x, props.y, props.width, props.height);
    if (inside) {
      this.ui.setAsHot(props.id);
    } else {
      this.ui.unsetAsHot(props.id);
    }

    let fillColor: string | undefined;
    if (this.ui.isActive(props.id)) {
      fillColor = props.activeColor;
    } else if (this.ui.isHot(props.id)) {
      fillColor = props.hotColor;
    } else {
      fillColor = props.color;
    }

    if (!fillColor) {
      return;
    }

    this.renderer.submit({
      type: "rect",
      fillColor,
      sortOrder: props.sortOrder,
      clipRegion: props.clipRegion,
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height
    });
  }

  onDragHorizontalScrollbar(pos: Vector) {
    const { layout } = this.tblctx;

    const hsbThumbX = clamp(pos.x, layout.hsbThumbMinX, layout.hsbThumbMaxX);
    pos.x = hsbThumbX;
    pos.y = layout.hsbTrackY;

    const newScrollX = Math.round(
      scale(hsbThumbX, layout.hsbThumbMinX, layout.hsbThumbMaxX, 0, layout.maxScrollX)
    );
    layout.scrollTo(newScrollX, layout.scrollY);
  }

  onDragVerticalScrollbar(pos: Vector) {
    const { layout } = this.tblctx;

    const vsbThumbY = clamp(pos.y, layout.vsbThumbMinY, layout.vsbThumbMaxY);
    pos.y = vsbThumbY;
    pos.x = layout.vsbTrackX;

    const newScrollY = Math.round(
      scale(vsbThumbY, layout.vsbThumbMinY, layout.vsbThumbMaxY, 0, layout.maxScrollY)
    );
    layout.scrollTo(layout.scrollX, newScrollY);
  }

  onDragColumnResizer(id: UiId, pos: Vector) {
    const { layout } = this.tblctx;

    pos.y = 1;

    const columnIndex = id.index!;
    const screenColumnPos = layout.getScreenColPos(columnIndex);
    const calculatedColumnWidth = pos.x - screenColumnPos + COLUMN_RESIZER_LEFT_WIDTH;
    const newColumnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);

    layout.resizeColumn(columnIndex, newColumnWidth);

    const rect = this.calculateColumnResizerRect(columnIndex);
    pos.x = rect.x;
  }

  calculateColumnResizerRect(columnIndex: number) {
    const { state, theme, layout } = this.tblctx;

    const columnWidth = state.columnWidths[columnIndex];

    const canonicalColumnLeft = this.tblctx.layout.getCanonicalColPos(columnIndex);
    const screenColumnLeft = canonicalColumnLeft - layout.scrollX;
    const screenColumnRight = screenColumnLeft + columnWidth;

    const screenScrollEnd = this.tblctx.layout.canonicalToScreenX(layout.scrollWidth);

    const calculatedResizerRight = screenColumnRight + COLUMN_RESIZER_LEFT_WIDTH + 1;
    const resizerRight = Math.min(calculatedResizerRight, screenScrollEnd);
    const resizerLeft = resizerRight - COLUMN_RESIZER_WIDTH;

    const rect = {
      x: resizerLeft,
      y: 1,
      width: COLUMN_RESIZER_WIDTH,
      height: theme.rowHeight - 1
    };

    return rect;
  }

  calculateRowRect(rowIndex: number) {
    const { theme, layout } = this.tblctx;

    const screenRowPos = layout.getScreenRowPos(rowIndex);

    return {
      x: 0,
      y: screenRowPos,
      width: layout.bodyWidth,
      height: theme.rowHeight
    };
  }

  isMouseInBody() {
    const { stage, layout } = this.tblctx;

    return stage.isMouseInRect(layout.bodyX, layout.bodyY, layout.bodyWidth, layout.bodyHeight);
  }

  bodyAreaPath() {
    const { layout } = this.tblctx;
    return this.pathFromRect(
      layout.bodyAreaX,
      layout.bodyAreaY,
      layout.bodyAreaWidth,
      layout.bodyAreaHeight
    );
  }

  headerAreaPath() {
    const { layout } = this.tblctx;
    return this.pathFromRect(
      layout.headerAreaX,
      layout.headerAreaY,
      layout.headerAreaWidth,
      layout.headerAreaHeight
    );
  }

  pathFromRect(x: number, y: number, width: number, height: number) {
    const path = new Path2D();
    path.rect(x, y, width, height);
    return path;
  }
}

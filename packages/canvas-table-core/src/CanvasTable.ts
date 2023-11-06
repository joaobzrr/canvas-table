import { Stage } from "./lib/Stage";
import { Renderer } from "./lib/Renderer";
import { UiContext } from "./lib/UiContext";
import { defaultTheme } from "./defaultTheme";
import {
  scale,
  clamp,
  isNumber,
  createVector,
  pathFromRect,
  createFontSpecifier,
  getFontMetrics,
  createRect,
} from "./utils";
import {
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  MIN_THUMB_LENGTH,
} from "./constants";
import {
  CreateCanvasTableParams,
  ColumnDef,
  ColumnState,
  DataRow,
  Theme,
  Rect,
  Vector,
  Layout,
  Viewport,
  IdSelector,
  SelectRowCallback,
  DraggableProps,
  FrameState,
  RowProps,
  Size,
  ResizeColumnCallback,
  PropSelector,
  DataRowId,
  PropValue
} from "./types";
import { UiId } from "./lib/UiContext/types";

export class CanvasTable {
  stage: Stage;
  renderer: Renderer;
  ui: UiContext;

  columnStates: ColumnState[];
  dataRows: DataRow[];
  theme: Theme;

  scrollPos: Vector;
  selectedRowId: DataRowId | null;

  selectId: IdSelector;
  selectProp: PropSelector;

  onSelectRow?: SelectRowCallback;
  onResizeColumn?: ResizeColumnCallback;

  frameState: FrameState = undefined!;

  constructor(params: CreateCanvasTableParams) {
    this.stage = new Stage(params.container, params.size);
    this.stage.setUpdateFunction(this.update.bind(this));

    this.renderer = new Renderer();
    this.ui = new UiContext();

    this.columnStates = CanvasTable.columnDefsToColumnStates(params.columnDefs);
    this.dataRows = params.dataRows;
    this.theme = params?.theme ?? defaultTheme;
    this.scrollPos = createVector();
    this.selectedRowId = null;

    this.onSelectRow = params.onSelectRow;

    this.onResizeColumn = params.onResizeColumn;

    this.selectId = params?.selectId ?? ((row) => row.id as DataRowId);

    this.selectProp = params.selectProp ?? ((row, key) => row[key] as PropValue);

    this.stage.run();
  }

  setColumnDefs(columnDefs: ColumnDef[]) {
    this.columnStates = CanvasTable.columnDefsToColumnStates(columnDefs);
  }

  setDataRows(dataRows: DataRow[]) {
    this.dataRows = dataRows;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setSize(size: Size) {
    this.stage.setSize(size);
  }

  cleanup() {
    this.stage.cleanup();
  }

  update() {
    const ctx = this.stage.getContext();
    const stageSize = this.stage.getSize();

    this.frameState = {} as FrameState;

    this.frameState.layout = this.reflow();

    {
      const scrollPos = createVector(this.scrollPos);
      if (this.ui.active === null) {
        scrollPos.x += this.stage.scrollAmount.x;
        scrollPos.y += this.stage.scrollAmount.y;
      }

      this.scrollPos.x = clamp(
        scrollPos.x,
        0,
        this.frameState.layout.maxScrollX,
      );
      this.scrollPos.y = clamp(
        scrollPos.y,
        0,
        this.frameState.layout.maxScrollY,
      );
    }

    this.frameState.viewport = this.calculateViewport(this.frameState.layout);

    if (this.theme.tableBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        x: 0,
        y: 0,
        width: stageSize.width,
        height: stageSize.height,
        color: this.theme.tableBackgroundColor,
      });
    }

    if (this.theme.bodyBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.bodyBackgroundColor,
        ...this.frameState.layout.bodyRect,
      });
    }

    if (this.theme.headerBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.headerBackgroundColor,
        ...this.frameState.layout.headerRect,
      });
    }

    this.doColumnResizer();

    if (this.frameState.layout.overflowX) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.frameState.layout.hsbRect,
        });
      }

      {
        const id = UiContext.idFromArgs("horizontal-scrollbar-thumb");

        this.doDraggable({
          id,
          rect: this.frameState.layout.hsbThumbRect,
          onDrag: (_id, pos) => this.onDragHorizontalScrollbar(pos),
          activeColor: this.theme.scrollbarThumbPressedColor,
          hotColor: this.theme.scrollbarThumbHoverColor,
          color: this.theme.scrollbarThumbColor,
        });
      }
    }

    if (this.frameState.layout.overflowY) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.frameState.layout.vsbRect,
        });
      }

      {
        const id = UiContext.idFromArgs("vertical-scrollbar-thumb");

        this.doDraggable({
          id,
          rect: this.frameState.layout.vsbThumbRect,
          onDrag: (_id, pos) =>
            this.onDragVerticalScrollbar(pos, this.frameState.layout),
          activeColor: this.theme.scrollbarThumbPressedColor,
          hotColor: this.theme.scrollbarThumbHoverColor,
          color: this.theme.scrollbarThumbColor,
        });
      }
    }

    this.doRow();

    // Draw outer canvas border
    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: 0,
      length: stageSize.width,
      color: this.theme.tableBorderColor,
    });

    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: stageSize.height - 1,
      length: stageSize.width,
      color: this.theme.tableBorderColor,
    });

    this.renderer.submit({
      type: "line",
      orientation: "vertical",
      x: 0,
      y: 0,
      length: stageSize.height,
      color: this.theme.tableBorderColor,
    });

    this.renderer.submit({
      type: "line",
      orientation: "vertical",
      x: stageSize.width - 1,
      y: 0,
      length: stageSize.height,
      color: this.theme.tableBorderColor,
    });

    // Draw header bottom border
    this.renderer.submit({
      type: "line",
      orientation: "horizontal",
      x: 0,
      y: this.theme.rowHeight,
      length: stageSize.width,
      color: this.theme.tableBorderColor,
    });

    // If horizontal scrollbar is visible, draw its border, otherwise,
    // draw table content right border
    if (this.frameState.layout.overflowX) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.frameState.layout.hsbRect.y - 1,
        length: stageSize.width,
        color: this.theme.tableBorderColor,
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: this.frameState.layout.gridWidth,
        y: 0,
        length: this.frameState.layout.gridHeight,
        color: this.theme.tableBorderColor,
      });
    }

    // If vertical scrollbar is visible, draw its border, otherwise,
    // draw table content bottom border
    if (this.frameState.layout.overflowY) {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: this.frameState.layout.vsbRect.x - 1,
        y: 0,
        length: stageSize.height,
        color: this.theme.tableBorderColor,
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.frameState.layout.gridHeight,
        length: this.frameState.layout.gridWidth,
        color: this.theme.tableBorderColor,
      });
    }

    // Draw grid horizontal lines
    for (
      let rowIndex = this.frameState.viewport.rowStart + 1;
      rowIndex < this.frameState.viewport.rowEnd;
      rowIndex++
    ) {
      const rowPos = this.frameState.viewport.rowPositions.get(rowIndex)!;

      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: rowPos,
        length: this.frameState.layout.gridWidth,
        color: this.theme.tableBorderColor,
      });
    }

    // Draw grid vertical lines
    for (
      let columnIndex = this.frameState.viewport.columnStart + 1;
      columnIndex < this.frameState.viewport.columnEnd;
      columnIndex++
    ) {
      const columnPos =
        this.frameState.viewport.columnPositions.get(columnIndex)!;

      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: columnPos,
        y: 0,
        length: this.frameState.layout.gridHeight,
        color: this.theme.tableBorderColor,
      });
    }

    {
      const fontStyle = this.theme.headerFontStyle ?? this.theme.fontStyle;
      const font = createFontSpecifier(
        this.theme.fontFamily,
        this.theme.fontSize,
        fontStyle,
      );

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBounginxBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const fontColor = this.theme.headerFontColor ?? this.theme.fontColor;

      const clipRegion = pathFromRect(this.frameState.layout.headerRect);

      for (
        let columnIndex = this.frameState.viewport.columnStart;
        columnIndex < this.frameState.viewport.columnEnd;
        columnIndex++
      ) {
        const columnState = this.columnStates[columnIndex];

        const columnPos =
          this.frameState.viewport.columnPositions.get(columnIndex)!;

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
          clipRegion,
        });
      }
    }

    {
      const fontStyle = this.theme.bodyFontStyle ?? this.theme.fontStyle;
      const font = createFontSpecifier(
        this.theme.fontFamily,
        this.theme.fontSize,
        fontStyle,
      );

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBoundingBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const fontColor = this.theme.bodyFontColor ?? this.theme.fontColor;

      const clipRegion = pathFromRect(this.frameState.layout.bodyRect);

      for (
        let columnIndex = this.frameState.viewport.columnStart;
        columnIndex < this.frameState.viewport.columnEnd;
        columnIndex++
      ) {
        const columnState = this.columnStates[columnIndex];

        const columnPos =
          this.frameState.viewport.columnPositions.get(columnIndex)!;

        const x = columnPos + this.theme.cellPadding;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;

        for (
          let rowIndex = this.frameState.viewport.rowStart;
          rowIndex < this.frameState.viewport.rowEnd;
          rowIndex++
        ) {
          const dataRow = this.dataRows[rowIndex];

          const rowPos = this.frameState.viewport.rowPositions.get(rowIndex)!;

          const y =
            rowPos + this.theme.rowHeight / 2 + halfFontBoundingBoxAscent;

          const value = this.selectProp(dataRow, columnState.key);
          const text = isNumber(value) ? value.toString() : (value as string);

          this.renderer.submit({
            type: "text",
            x,
            y,
            color: fontColor,
            text,
            font,
            maxWidth,
            clipRegion,
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
    const outerTableWidth = canvasSize.width - 1;
    const outerTableHeight = canvasSize.height - 1;

    const innerTableWidth = outerTableWidth - scrollbarThickness - 1;
    const innerTableHeight = outerTableHeight - scrollbarThickness - 1;

    const outerBodyHeight = outerTableHeight - rowHeight;
    const innerBodyHeight = innerTableHeight - rowHeight;

    let overflowX: boolean;
    let overflowY: boolean;
    if (outerTableWidth >= contentWidth && outerBodyHeight >= contentHeight) {
      overflowX = overflowY = false;
    } else {
      overflowX = innerTableWidth < contentWidth;
      overflowY = innerBodyHeight < contentHeight;
    }

    let tableWidth: number;
    let bodyWidth: number;

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
      height: tableHeight,
    };

    const bodyRect = {
      x: 0,
      y: rowHeight,
      width: bodyWidth,
      height: bodyHeight,
    };

    const headerRect = {
      x: 0,
      y: 0,
      width: tableWidth,
      height: rowHeight,
    };

    const scrollWidth = Math.max(contentWidth, bodyWidth);
    const scrollHeight = Math.max(contentHeight, bodyHeight);

    const maxScrollX = scrollWidth - bodyWidth;
    const maxScrollY = scrollHeight - bodyHeight;

    const gridWidth = Math.min(tableWidth, contentWidth);
    const gridHeight = Math.min(tableHeight, contentHeight + rowHeight);

    const hsbX = 1;
    const hsbY = tableHeight + 1;
    const hsbWidth = tableWidth - 1;
    const hsbHeight = scrollbarThickness;
    const hsbRect = createRect(hsbX, hsbY, hsbWidth, hsbHeight);

    const hsbTrackX = hsbX + scrollbarTrackMargin;
    const hsbTrackY = hsbY + scrollbarTrackMargin;
    const hsbTrackWidth = hsbRect.width - scrollbarTrackMargin * 2;
    const hsbTrackHeight = hsbRect.height - scrollbarTrackMargin * 2;
    const hsbTrackRect = createRect(
      hsbTrackX,
      hsbTrackY,
      hsbTrackWidth,
      hsbTrackHeight,
    );

    const hsbThumbWidth = Math.max(
      (bodyWidth / scrollWidth) * hsbTrackWidth,
      MIN_THUMB_LENGTH,
    );
    const hsbThumbHeight = hsbTrackHeight;

    const hsbThumbMinX = hsbTrackX;
    const hsbThumbMaxX = hsbTrackX + hsbTrackWidth - hsbThumbWidth;

    const hsbThumbX = scale(
      this.scrollPos.x,
      0,
      maxScrollX,
      hsbThumbMinX,
      hsbThumbMaxX,
    );
    const hsbThumbY = hsbTrackY;

    const hsbThumbRect = createRect(
      hsbThumbX,
      hsbThumbY,
      hsbThumbWidth,
      hsbThumbHeight,
    );

    const vsbX = tableWidth + 1;
    const vsbY = rowHeight + 1;
    const vsbWidth = scrollbarThickness;
    const vsbHeight = bodyHeight - 1;
    const vsbRect = createRect(vsbX, vsbY, vsbWidth, vsbHeight);

    const vsbTrackX = vsbRect.x + scrollbarTrackMargin;
    const vsbTrackY = vsbRect.y + scrollbarTrackMargin;
    const vsbTrackWidth = vsbRect.width - scrollbarTrackMargin * 2;
    const vsbTrackHeight = vsbRect.height - scrollbarTrackMargin * 2;
    const vsbTrackRect = createRect(
      vsbTrackX,
      vsbTrackY,
      vsbTrackWidth,
      vsbTrackHeight,
    );

    const vsbThumbWidth = vsbTrackWidth;
    const vsbThumbHeight = Math.max(
      (bodyHeight / scrollHeight) * vsbTrackHeight,
      MIN_THUMB_LENGTH,
    );

    const vsbThumbMinY = vsbTrackY;
    const vsbThumbMaxY = vsbTrackY + vsbTrackHeight - vsbThumbHeight;

    const vsbThumbX = vsbTrackX;
    const vsbThumbY = scale(
      this.scrollPos.y,
      0,
      maxScrollY,
      vsbThumbMinY,
      vsbThumbMaxY,
    );

    const vsbThumbRect = createRect(
      vsbThumbX,
      vsbThumbY,
      vsbThumbWidth,
      vsbThumbHeight,
    );

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
      hsbThumbRect,
      hsbThumbMinX,
      hsbThumbMaxX,
      vsbRect,
      vsbTrackRect,
      vsbThumbRect,
      vsbThumbMinY,
      vsbThumbMaxY,
      overflowX,
      overflowY,
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
    const rowEnd = Math.min(
      Math.ceil(scrollBottom / this.theme.rowHeight),
      this.dataRows.length,
    );

    const rowPositions = new Map();
    for (let i = rowStart; i < rowEnd; i++) {
      const rowPosition =
        i * this.theme.rowHeight + this.theme.rowHeight - this.scrollPos.y;
      rowPositions.set(i, rowPosition);
    }

    return {
      columnStart,
      columnEnd,
      columnPositions,
      rowStart,
      rowEnd,
      rowPositions,
    };
  }

  doColumnResizer() {
    const { layout, viewport } = this.frameState;
    const { headerRect } = layout;
    const { columnStart, columnEnd } = viewport;

    const clipRegion = pathFromRect(headerRect);

    if (this.ui.isActive("column-resizer")) {
      this.doOneColumnResizer(this.ui.active!, clipRegion);
      return;
    }

    for (
      let columnIndex = columnStart;
      columnIndex < columnEnd;
      columnIndex++
    ) {
      const id = UiContext.idFromArgs("column-resizer", columnIndex);
      this.doOneColumnResizer(id, clipRegion);
    }
  }

  doOneColumnResizer(id: UiId, clipRegion: Path2D) {
    const columnIndex = id.index!;
    const rect = this.calculateColumnResizerRect(columnIndex);

    this.doDraggable({
      id,
      rect,
      onDrag: (id, pos) => this.onDragColumnResizer(id, pos),
      activeColor: this.theme.columnResizerColor,
      hotColor: this.theme.columnResizerColor,
      clipRegion,
    });
  }

  doDraggable(props: DraggableProps) {
    if (this.ui.isActive(props.id)) {
      if (this.stage.isMouseReleased(Stage.MOUSE_BUTTONS.PRIMARY)) {
        // @Todo Move this to a separate function
        if (this.ui.active && this.ui.active.name === props.id.name) {
          this.ui.active = null;
        }
      } else {
        const pos = createVector(
          this.stage.dragAnchorPosition.x + this.stage.dragDistance.x,
          this.stage.dragAnchorPosition.y + this.stage.dragDistance.y,
        );

        if (props.onDrag) {
          props.onDrag(props.id, pos);
        }

        props.rect.x = pos.x;
        props.rect.y = pos.y;
      }
    } else if (this.ui.isHot(props.id)) {
      if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        this.ui.setAsActive(props.id);

        this.stage.dragAnchorPosition.x = props.rect.x;
        this.stage.dragAnchorPosition.y = props.rect.y;
      }
    }

    const inside = this.stage.isMouseInRect(props.rect);
    if (inside) {
      this.ui.setAsHot(props.id);
    } else {
      this.ui.unsetAsHot(props.id);
    }

    let color: string | undefined;
    if (this.ui.isActive(props.id)) {
      color = props.activeColor;
    } else if (this.ui.isHot(props.id)) {
      color = props.hotColor;
    } else {
      color = props.color;
    }

    if (!color) {
      return;
    }

    this.renderer.submit({
      type: "rect",
      color,
      sortOrder: 2,
      clipRegion: props.clipRegion,
      ...props.rect,
    });
  }

  doRow() {
    const clipRegion = this.pathFromRect(this.frameState.layout.bodyRect);

    for (
      let rowIndex = this.frameState.viewport.rowStart;
      rowIndex < this.frameState.viewport.rowEnd;
      rowIndex++
    ) {
      const id = UiContext.idFromArgs("row", rowIndex);
      const rect = this.calculateRowRect(
        this.frameState.layout,
        this.frameState.viewport,
        rowIndex,
      );

      this.doOneRow({
        id,
        rect,
        hotColor: this.theme.hoveredRowColor,
        activeColor: this.theme.selectedRowColor,
        clipRegion,
      });
    }
  }

  doOneRow(props: RowProps) {
    const rowIndex = props.id.index!;
    const dataRow = this.dataRows[rowIndex];
    const dataRowId = this.selectId(dataRow);

    if (this.ui.isHot(props.id)) {
      if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        this.selectedRowId = dataRowId;

        if (this.onSelectRow) {
          this.onSelectRow(this.selectedRowId, dataRow);
        }
      }
    }

    if (this.selectedRowId === dataRowId) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.selectedRowColor,
        clipRegion: props.clipRegion,
        ...props.rect,
      });
    } else if (this.theme.hoveredRowColor) {
      const insideBody = this.stage.isMouseInRect(
        this.frameState.layout.bodyRect,
      );
      if (!insideBody) {
        this.ui.unsetAsHot(props.id);
      } else {
        const insideRect = this.stage.isMouseInRect(props.rect);
        if (!insideRect) {
          this.ui.unsetAsHot(props.id);
        } else {
          this.ui.setAsHot(props.id);

          if (this.ui.isHot(props.id)) {
            this.renderer.submit({
              type: "rect",
              color: this.theme.hoveredRowColor,
              clipRegion: props.clipRegion,
              ...props.rect,
            });
          }
        }
      }
    }
  }

  onDragHorizontalScrollbar(pos: Vector) {
    const { maxScrollX, hsbTrackRect, hsbThumbMinX, hsbThumbMaxX } =
      this.frameState.layout;

    pos.y = hsbTrackRect.y;

    const hsbThumbX = clamp(pos.x, hsbThumbMinX, hsbThumbMaxX);
    pos.x = hsbThumbX;

    const newScrollX = Math.round(
      scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX),
    );
    this.scrollPos.x = newScrollX;
  }

  onDragVerticalScrollbar(pos: Vector, layout: Layout) {
    const { maxScrollY, vsbTrackRect, vsbThumbMinY, vsbThumbMaxY } = layout;

    pos.x = vsbTrackRect.x;

    const vsbThumbY = clamp(pos.y, vsbThumbMinY, vsbThumbMaxY);
    pos.y = vsbThumbY;

    const newScrollY = Math.round(
      scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY),
    );
    this.scrollPos.y = newScrollY;
  }

  onDragColumnResizer(id: UiId, pos: Vector) {
    pos.y = 1;

    const columnIndex = id.index!;

    const columnState = this.columnStates[columnIndex];
    const columnPos =
      this.frameState.viewport.columnPositions.get(columnIndex)!;

    const calculatedColumnWidth = pos.x - columnPos + COLUMN_RESIZER_LEFT_WIDTH;
    const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
    const columnWidthChanged = columnWidth !== columnState.width;
    columnState.width = columnWidth;

    this.frameState.layout = this.reflow();

    this.scrollPos.x = Math.min(
      this.scrollPos.x,
      this.frameState.layout.maxScrollX,
    );
    this.scrollPos.y = Math.min(
      this.scrollPos.y,
      this.frameState.layout.maxScrollY,
    );

    this.frameState.viewport = this.calculateViewport(this.frameState.layout);

    const rect = this.calculateColumnResizerRect(columnIndex);
    pos.x = rect.x;

    if (this.onResizeColumn && columnWidthChanged) {
      this.onResizeColumn(columnState.key, columnState.width);
    }
  }

  calculateColumnResizerRect(columnIndex: number) {
    const { layout, viewport } = this.frameState;
    const { scrollWidth } = layout;
    const { columnPositions } = viewport;

    const columnState = this.columnStates[columnIndex];
    const columnLeft = columnPositions.get(columnIndex)!;
    const columnRight = columnLeft + columnState.width;

    const scrollEndRelX = this.relX(scrollWidth);

    const calculatedResizerRight = columnRight + COLUMN_RESIZER_LEFT_WIDTH + 1;
    const resizerRight = Math.min(calculatedResizerRight, scrollEndRelX);
    const resizerLeft = resizerRight - COLUMN_RESIZER_WIDTH;

    const rect = {
      x: resizerLeft,
      y: 1,
      width: COLUMN_RESIZER_WIDTH,
      height: this.theme.rowHeight - 1,
    };

    return rect;
  }

  calculateRowRect(layout: Layout, viewport: Viewport, rowIndex: number) {
    return {
      x: 0,
      y: viewport.rowPositions.get(rowIndex)!,
      width: layout.gridWidth,
      height: this.theme.rowHeight,
    };
  }

  relPos(pos: Vector) {
    return createVector(this.relX(pos.x), this.relY(pos.y));
  }

  relX(x: number) {
    return x - this.scrollPos.x;
  }

  relY(y: number) {
    return y - this.scrollPos.y;
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
      columnStates.push({ ...rest, width: _width });
    }
    return columnStates;
  }
}

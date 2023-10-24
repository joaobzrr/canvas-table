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
  getFontMetrics,
  createRect
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
  IdSelector,
  SelectRowCallback,
  DraggableProps,
  FrameState,
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
  selectedRowId: DataRowValue | null;

  selectId: IdSelector;

  onSelect?: SelectRowCallback;

  frameState: FrameState = undefined!;

  constructor(params: CreateCanvasTableParams) {
    this.stage = new Stage(params.container, params.size);
    this.stage.setUpdateFunction(this.update.bind(this));

    this.renderer = new Renderer();
    this.ui = new UiContext();

    this.columnStates = CanvasTable.columnDefsToColumnStates(params.columnDefs);
    this.dataRows = params.dataRows;
    this.theme = shallowMerge({}, defaultTheme, params.theme);
    this.scrollPos = { x: 0, y: 0 };
    this.selectedRowId = null;
    this.onSelect = params.onSelect;

    const selectId = params?.selectId ?? ((dataRow: any) => dataRow.id);
    this.selectId = selectId;

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

    this.frameState = {} as FrameState;

    this.frameState.layout = this.reflow();

    // @Todo Get rid of this
    if (this.stage.isMouseReleased(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.ui.active = null;
    }

    {
      const scrollPos = createVector(this.scrollPos);
      if (this.ui.active === null) {
        scrollPos.x += this.stage.scrollAmount.x;
        scrollPos.y += this.stage.scrollAmount.y;
      }

      this.scrollPos.x = clamp(scrollPos.x, 0, this.frameState.layout.maxScrollX);
      this.scrollPos.y = clamp(scrollPos.y, 0, this.frameState.layout.maxScrollY);
    }

    this.frameState.viewport = this.calculateViewport(this.frameState.layout);

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
        ...this.frameState.layout.bodyRect
      });
    }

    if (this.theme.headerBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.headerBackgroundColor,
        ...this.frameState.layout.headerRect
      });
    }

    this.doColumnResizer();

    // {

    //   for (let columnIndex = viewport.columnStart; columnIndex < viewport.columnEnd; columnIndex++) {
    //     const id = UiContext.idFromArgs("column-resizer", columnIndex);

    //     const columnEndPosition = this.getColumnEndPosition(viewport, columnIndex);
    //     const rect = this.calculateColumnResizerRect(this.theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

    //     if (this.stage.isMouseInRect(rect)) {
    //       this.ui.setAsHot(id);

    //       if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
    //         // @Todo Unset as active
    //         this.ui.setActive(id);

    //         const dragAnchorPosition = createVector(columnEndPosition, rect.y);
    //         this.stage.dragAnchorPosition = dragAnchorPosition;
    //       }

    //       break;
    //     } else {
    //       this.ui.unsetAsHot("column-resizer", columnIndex);
    //     }
    //   }

    //   if (this.ui.isActive("column-resizer")) {
    //     const columnIndex = this.ui.getActiveIndex()!;

    //     const columnState = this.columnStates[columnIndex];
    //     const columnPos = viewport.columnPositions.get(columnIndex)!;

    //     const calculatedColumnWidth = this.stage.dragAnchorPosition.x + this.stage.dragDistance.x - columnPos;
    //     const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
    //     columnState.width = columnWidth;

    //     layout = this.reflow();

    //     this.scrollPos.x = Math.min(this.scrollPos.x, layout.maxScrollX);
    //     this.scrollPos.y = Math.min(this.scrollPos.y, layout.maxScrollY);

    //     viewport = this.calculateViewport(layout);
    //   }

    //   if (this.ui.isActive("column-resizer") || this.ui.isHot("column-resizer")) {
    //     const columnIndex = this.ui.getActiveIndex() ?? this.ui.getHotIndex()!;

    //     const columnEndPosition = this.getColumnEndPosition(viewport, columnIndex);
    //     const rect = this.calculateColumnResizerRect(this.theme.rowHeight, viewport.tableEndPosition, columnEndPosition);

    //     const clipRegion = pathFromRect(layout.headerRect);

    //     this.renderer.submit({
    //       type: "rect",
    //       ...rect,
    //       color: this.theme.columnResizerColor,
    //       sortOrder: 2,
    //       clipRegion
    //     });
    //   }
    // }

    if (this.frameState.layout.overflowX) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.frameState.layout.hsbRect
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
          color: this.theme.scrollbarThumbColor
        });
      }
    }

    if (this.frameState.layout.overflowY) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.frameState.layout.vsbRect
        });
      }

      {
        const id = UiContext.idFromArgs("vertical-scrollbar-thumb");

        this.doDraggable({
          id,
          rect: this.frameState.layout.vsbThumbRect,
          onDrag: (_id, pos) => this.onDragVerticalScrollbar(pos, this.frameState.layout),
          activeColor: this.theme.scrollbarThumbPressedColor,
          hotColor: this.theme.scrollbarThumbHoverColor,
          color: this.theme.scrollbarThumbColor
        });
      }
    }

    /*
    if (this.stage.isMouseInRect(layout.bodyRect)) {
      for (let rowIndex = viewport.rowStart; rowIndex < viewport.rowEnd; rowIndex++) {
        const rect = this.calculateRowRect(layout, viewport, rowIndex);

        if (this.stage.isMouseInRect(rect)) {
          this.ui.setAsHot("row-hover", rowIndex);

          if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
            const dataRow = this.dataRows[rowIndex];
            const dataRowId = this.selectId(dataRow)
            this.selectedRowId = dataRowId;

            if (this.onSelect) {
              this.onSelect(dataRowId, dataRow);
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
      const dataRowId = this.selectId(dataRow);
      if (dataRowId === this.selectedRowId) {
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
    */

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
    if (this.frameState.layout.overflowX) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.frameState.layout.hsbRect.y - 1,
        length: stageSize.width,
        color: this.theme.tableBorderColor
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: this.frameState.layout.gridWidth,
        y: 0,
        length: this.frameState.layout.gridHeight,
        color: this.theme.tableBorderColor
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
        color: this.theme.tableBorderColor
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.frameState.layout.gridHeight,
        length: this.frameState.layout.gridWidth,
        color: this.theme.tableBorderColor
      });
    }

    // Draw grid horizontal lines
    for (let rowIndex = this.frameState.viewport.rowStart + 1; rowIndex < this.frameState.viewport.rowEnd; rowIndex++) {
      const rowPos = this.frameState.viewport.rowPositions.get(rowIndex)!;

      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: rowPos,
        length: this.frameState.layout.gridWidth,
        color: this.theme.tableBorderColor
      });
    }

    // Draw grid vertical lines
    for (let columnIndex = this.frameState.viewport.columnStart + 1; columnIndex < this.frameState.viewport.columnEnd; columnIndex++) {
      const columnPos = this.frameState.viewport.columnPositions.get(columnIndex)!;

      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: columnPos,
        y: 0,
        length: this.frameState.layout.gridHeight,
        color: this.theme.tableBorderColor
      });
    }

    {
      const fontStyle = this.theme.headerFontStyle ?? this.theme.fontStyle;
      const font = createFontSpecifier(this.theme.fontFamily, this.theme.fontSize, fontStyle);

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBounginxBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const fontColor = this.theme.headerFontColor ?? this.theme.fontColor;

      const clipRegion = pathFromRect(this.frameState.layout.headerRect);

      for (let columnIndex = this.frameState.viewport.columnStart; columnIndex < this.frameState.viewport.columnEnd; columnIndex++) {
        const columnState = this.columnStates[columnIndex];

        const columnPos = this.frameState.viewport.columnPositions.get(columnIndex)!;

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

      const clipRegion = pathFromRect(this.frameState.layout.bodyRect);

      for (let columnIndex = this.frameState.viewport.columnStart; columnIndex < this.frameState.viewport.columnEnd; columnIndex++) {
        const columnState = this.columnStates[columnIndex];

        const columnPos = this.frameState.viewport.columnPositions.get(columnIndex)!;

        const x = columnPos + this.theme.cellPadding;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;

        for (let rowIndex = this.frameState.viewport.rowStart; rowIndex < this.frameState.viewport.rowEnd; rowIndex++) {
          const dataRow = this.dataRows[rowIndex];

          const rowPos = this.frameState.viewport.rowPositions.get(rowIndex)!;

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

    const hsbX = 1;
    const hsbY = tableHeight + 1;
    const hsbWidth = tableWidth - 1;
    const hsbHeight = scrollbarThickness;
    const hsbRect = createRect(hsbX, hsbY, hsbWidth, hsbHeight);

    const hsbTrackX = hsbX + scrollbarTrackMargin;
    const hsbTrackY = hsbY + scrollbarTrackMargin;
    const hsbTrackWidth  = hsbRect.width  - (scrollbarTrackMargin * 2);
    const hsbTrackHeight = hsbRect.height - (scrollbarTrackMargin * 2);
    const hsbTrackRect = createRect(hsbTrackX, hsbTrackY, hsbTrackWidth, hsbTrackHeight);

    const hsbThumbWidth = Math.max((bodyWidth / scrollWidth) * hsbTrackWidth, MIN_THUMB_LENGTH);
    const hsbThumbHeight = hsbTrackHeight;

    const hsbThumbMinX = hsbTrackX;
    const hsbThumbMaxX = hsbTrackX + hsbTrackWidth - hsbThumbWidth;

    const hsbThumbX = scale(this.scrollPos.x, 0, maxScrollX, hsbThumbMinX, hsbThumbMaxX);
    const hsbThumbY = hsbTrackY;

    const hsbThumbRect = createRect(hsbThumbX, hsbThumbY, hsbThumbWidth, hsbThumbHeight);

    const vsbX = tableWidth + 1;
    const vsbY = rowHeight + 1;
    const vsbWidth = scrollbarThickness;
    const vsbHeight = bodyHeight - 1;
    const vsbRect = createRect(vsbX, vsbY, vsbWidth, vsbHeight);

    const vsbTrackX = vsbRect.x + scrollbarTrackMargin;
    const vsbTrackY = vsbRect.y + scrollbarTrackMargin;
    const vsbTrackWidth = vsbRect.width  - (scrollbarTrackMargin * 2);
    const vsbTrackHeight = vsbRect.height - (scrollbarTrackMargin * 2);
    const vsbTrackRect = createRect(vsbTrackX, vsbTrackY, vsbTrackWidth, vsbTrackHeight);

    const vsbThumbWidth = vsbTrackWidth;
    const vsbThumbHeight = Math.max((bodyHeight / scrollHeight) * vsbTrackHeight, MIN_THUMB_LENGTH);

    const vsbThumbMinY = vsbTrackY;
    const vsbThumbMaxY = vsbTrackY + vsbTrackHeight - vsbThumbHeight;

    const vsbThumbX = vsbTrackX;
    const vsbThumbY = scale(this.scrollPos.y, 0, maxScrollY, vsbThumbMinY, vsbThumbMaxY);

    const vsbThumbRect = createRect(vsbThumbX, vsbThumbY, vsbThumbWidth, vsbThumbHeight);

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

  doColumnResizer() {
    const { layout, viewport } = this.frameState;
    const { headerRect } = layout;
    const { columnStart, columnEnd } = viewport;

    const clipRegion = pathFromRect(headerRect);

    if (this.ui.isActive("column-resizer")) {
      this.doOneColumnResizer(this.ui.active!, clipRegion);
      return;
    }

    for (let columnIndex = columnStart; columnIndex < columnEnd; columnIndex++) {
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
      activeColor: "blue",
      hotColor: "blue",
      clipRegion
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
          this.stage.dragAnchorPosition.y + this.stage.dragDistance.y
        );

        if (props.onDrag) {
          props.onDrag(props.id, pos)
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
      ...props.rect
    });
  }

  onDragHorizontalScrollbar(pos: Vector) {
    const { maxScrollX, hsbTrackRect, hsbThumbMinX, hsbThumbMaxX } = this.frameState.layout;

    pos.y = hsbTrackRect.y;

    const hsbThumbX = clamp(pos.x, hsbThumbMinX, hsbThumbMaxX);
    pos.x = hsbThumbX;

    const newScrollX = Math.round(scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX));
    this.scrollPos.x = newScrollX;
  }

  onDragVerticalScrollbar(pos: Vector, layout: Layout) {
    const { maxScrollY, vsbTrackRect, vsbThumbMinY, vsbThumbMaxY } = layout;

    pos.x = vsbTrackRect.x;

    const vsbThumbY = clamp(pos.y, vsbThumbMinY, vsbThumbMaxY);
    pos.y = vsbThumbY;

    const newScrollY = Math.round(scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY));
    this.scrollPos.y = newScrollY;
  }

  onDragColumnResizer(id: UiId, pos: Vector) {
    pos.y = 1;

    const columnIndex = id.index!;

    const columnState = this.columnStates[columnIndex];
    const columnPos = this.frameState.viewport.columnPositions.get(columnIndex)!;

    const calculatedColumnWidth = pos.x - columnPos + COLUMN_RESIZER_LEFT_WIDTH;
    const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
    columnState.width = columnWidth;

    this.frameState.layout = this.reflow();

    this.scrollPos.x = Math.min(this.scrollPos.x, this.frameState.layout.maxScrollX);
    this.scrollPos.y = Math.min(this.scrollPos.y, this.frameState.layout.maxScrollY);

    this.frameState.viewport = this.calculateViewport(this.frameState.layout);

    const rect = this.calculateColumnResizerRect(columnIndex);
    pos.x = rect.x;
  }

  calculateColumnResizerRect(columnIndex: number) {
    const { viewport } = this.frameState;
    const { columnPositions, tableEndPosition } = viewport;

    const columnState = this.columnStates[columnIndex];
    const columnLeft = columnPositions.get(columnIndex)!;
    const columnRight = columnLeft + columnState.width;

    const calculatedResizerRight = columnRight + COLUMN_RESIZER_LEFT_WIDTH + 1;
    const resizerRight = Math.min(calculatedResizerRight, tableEndPosition);
    const resizerLeft = resizerRight - COLUMN_RESIZER_WIDTH;

    const rect = {
      x: resizerLeft,
      y: 1,
      width: COLUMN_RESIZER_WIDTH,
      height: this.theme.rowHeight - 1
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

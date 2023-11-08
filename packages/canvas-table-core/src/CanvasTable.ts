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
  ColumnDef,
  ColumnState,
  DataRow,
  Theme,
  Rect,
  Vector,
  Layout,
  IdSelector,
  SelectRowCallback,
  DraggableProps,
  Size,
  ResizeColumnCallback,
  PropSelector,
  DataRowId,
  PropValue,
  TableEvent
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

  eventQueue: TableEvent[];

  layout: Layout = undefined!;

  mouseCol: number;
  mouseRow: number;

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

    this.eventQueue = [];

    this.mouseCol = -1;
    this.mouseRow = -1;

    this.stage.run();
  }

  setColumnDefs(columnDefs: ColumnDef[]) {
    this.eventQueue.push({
      type: "columnDefsChange",
      columnDefs,
      requiresReflow: true
    });
  }

  setDataRows(dataRows: DataRow[]) {
    this.eventQueue.push({
      type: "dataRowsChange",
      dataRows,
      requiresReflow: true
    });
  }

  setTheme(theme: Theme) {
    this.eventQueue.push({
      type: "themeChange",
      theme,
      requiresReflow: true
    });
  }

  setSize(size: Size) {
    this.eventQueue.push({
      type: "sizeChange",
      size,
      requiresReflow: true
    });
  }

  cleanup() {
    this.stage.cleanup();
  }

  update() {
    if (!this.layout) {
      this.layout = this.createLayout();
      this.reflow();
    }

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;

      switch (event.type) {
        case "columnDefsChange":
          this.columnStates = CanvasTable.columnDefsToColumnStates(event.columnDefs);
          break;
        case "dataRowsChange":
          this.dataRows = event.dataRows;
          break;
        case "themeChange":
          this.theme = event.theme;
          break;
        case "sizeChange":
          this.stage.setSize(event.size);
          break;
      }

      if (event.requiresReflow) {
        this.reflow();
      }
    }

    {
      let { x: newScrollX, y: newScrollY } = this.scrollPos;

      if (this.ui.active === null) {
        newScrollX += this.stage.scrollAmount.x;
        newScrollY += this.stage.scrollAmount.y;
      }

      const { maxScrollX, maxScrollY } = this.layout;

      newScrollX = clamp(newScrollX, 0, maxScrollX);
      newScrollY = clamp(newScrollY, 0, maxScrollY);
      if (newScrollX !== this.scrollPos.x || newScrollY !== this.scrollPos.y) {
        this.scrollPos.x = newScrollX;
        this.scrollPos.y = newScrollY;
        this.updateScrollbarThumbPositions();
        this.updateViewportLayout();
      }
    }

    this.mouseCol = -1;
    this.mouseRow = -1;

    {
      const { gridWidth, gridHeight } = this.layout;
      const gridRect = createRect({ width: gridWidth, height: gridHeight });

      if (this.stage.isMouseInRect(gridRect)) {
        const { x: mouseX, y: mouseY } = this.stage.currentMousePosition;
        const { columnStart, columnEnd, canonicalColumnPositions } = this.layout;
        const { rowHeight } = this.theme;

        for (let columnIndex = columnStart; columnIndex < columnEnd; columnIndex++) {
          const columnState = this.columnStates[columnIndex];

          const canonicalColumnLeft = canonicalColumnPositions[columnIndex];
          const screenColumnLeft = this.calcScreenX(canonicalColumnLeft);
          const screenColumnRight = screenColumnLeft + columnState.width;
          if (mouseX >= screenColumnLeft && mouseX < screenColumnRight) {
            this.mouseCol = columnIndex;
            break;
          }
        }

        this.mouseRow = Math.floor((this.calcCanonicalY(mouseY) - rowHeight) / rowHeight);
      }
    }

    const ctx = this.stage.getContext();
    const stageSize = this.stage.getSize();

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
        ...this.layout.bodyRect
      });
    }

    if (this.theme.headerBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.headerBackgroundColor,
        ...this.layout.headerRect
      });
    }

    this.doColumnResizer();

    if (this.mouseRow !== -1) {
      if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        const dataRow = this.dataRows[this.mouseRow];
        const dataRowId = this.selectId(dataRow);

        this.selectedRowId = dataRowId;
        if (this.onSelectRow) {
          this.onSelectRow(this.selectedRowId, dataRow);
        }
      }

      const clipRegion = this.pathFromRect(this.layout.bodyRect);

      if (!this.ui.isAnyActive() && this.theme.hoveredRowColor) {
        const rowRect = this.calculateRowRect(this.layout, this.mouseRow);
        this.renderer.submit({
          type: "rect",
          color: this.theme.hoveredRowColor,
          clipRegion,
          ...rowRect
        });
      }

      if (this.mouseCol !== -1) {
        const { canonicalColumnPositions, bodyRect } = this.layout;
        const { rowHeight } = this.theme;
        const { x: scrollLeft, y: scrollTop } = this.scrollPos;

        const columnState = this.columnStates[this.mouseCol];
        const canonicalColumnLeft = canonicalColumnPositions[this.mouseCol];
        const canonicalColumnRight = canonicalColumnLeft + columnState.width;

        const canonicalRowTop = this.mouseRow * rowHeight;
        const canonicalRowBottom = canonicalRowTop + rowHeight;

        if (this.stage.isMouseDoubleClicked(Stage.MOUSE_BUTTONS.PRIMARY)) {
          const scrollColumnRight = canonicalColumnRight - bodyRect.width;
          if (scrollLeft > canonicalColumnLeft) {
            this.scrollPos.x = canonicalColumnLeft;
          } else if (scrollLeft < scrollColumnRight) {
            this.scrollPos.x = Math.min(canonicalColumnLeft, scrollColumnRight);
          }

          const scrollRowBottom = canonicalRowBottom - bodyRect.height;
          if (scrollTop > canonicalRowTop) {
            this.scrollPos.y = canonicalRowTop;
          } else if (scrollTop < scrollRowBottom) {
            this.scrollPos.y = scrollRowBottom;
          }

          this.updateScrollbarThumbPositions();
          this.updateViewportLayout();
        }
      }
    }

    if (this.selectedRowId !== null) {
      const { rowStart, rowEnd } = this.layout;

      const clipRegion = this.pathFromRect(this.layout.bodyRect);

      for (let rowIndex = rowStart; rowIndex < rowEnd; rowIndex++) {
        const dataRow = this.dataRows[rowIndex];
        const dataRowId = this.selectId(dataRow);

        if (this.selectedRowId === dataRowId) {
          const rect = this.calculateRowRect(this.layout, rowIndex);

          this.renderer.submit({
            type: "rect",
            color: this.theme.selectedRowColor,
            clipRegion: clipRegion,
            ...rect
          });

          break;
        }
      }
    }

    if (this.layout.overflowX) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.layout.hsbRect
        });
      }

      this.doDraggable({
        id: UiContext.createId("horizontal-scrollbar-thumb"),
        rect: this.layout.hsbThumbRect,
        onDrag: (_id, pos) => this.onDragHorizontalScrollbar(pos),
        activeColor: this.theme.scrollbarThumbPressedColor,
        hotColor: this.theme.scrollbarThumbHoverColor,
        color: this.theme.scrollbarThumbColor
      });
    }

    if (this.layout.overflowY) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.layout.vsbRect
        });
      }

      this.doDraggable({
        id: UiContext.createId("vertical-scrollbar-thumb"),
        rect: this.layout.vsbThumbRect,
        onDrag: (_id, pos) => this.onDragVerticalScrollbar(pos),
        activeColor: this.theme.scrollbarThumbPressedColor,
        hotColor: this.theme.scrollbarThumbHoverColor,
        color: this.theme.scrollbarThumbColor
      });
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
    if (this.layout.overflowX) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.layout.hsbRect.y - 1,
        length: stageSize.width,
        color: this.theme.tableBorderColor
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: this.layout.gridWidth,
        y: 0,
        length: this.layout.gridHeight,
        color: this.theme.tableBorderColor
      });
    }

    // If vertical scrollbar is visible, draw its border, otherwise,
    // draw table content bottom border
    if (this.layout.overflowY) {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: this.layout.vsbRect.x - 1,
        y: 0,
        length: stageSize.height,
        color: this.theme.tableBorderColor
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.layout.gridHeight,
        length: this.layout.gridWidth,
        color: this.theme.tableBorderColor
      });
    }

    // Draw grid horizontal lines
    for (let rowIndex = this.layout.rowStart + 1; rowIndex < this.layout.rowEnd; rowIndex++) {
      const canonicalRowPos = rowIndex * this.theme.rowHeight;
      const screenRowPos = this.calcScreenY(canonicalRowPos) + this.theme.rowHeight;

      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: screenRowPos,
        length: this.layout.gridWidth,
        color: this.theme.tableBorderColor
      });
    }

    // Draw grid vertical lines
    for (
      let columnIndex = this.layout.columnStart + 1;
      columnIndex < this.layout.columnEnd;
      columnIndex++
    ) {
      const canonicalColumnPos = this.layout.canonicalColumnPositions[columnIndex]!;
      const screenColumnPos = this.calcScreenX(canonicalColumnPos);

      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: screenColumnPos,
        y: 0,
        length: this.layout.gridHeight,
        color: this.theme.tableBorderColor
      });
    }

    {
      const fontStyle = this.theme.headerFontStyle ?? this.theme.fontStyle;
      const font = createFontSpecifier(this.theme.fontFamily, this.theme.fontSize, fontStyle);

      const { fontBoundingBoxAscent } = getFontMetrics(ctx, font);
      const halfFontBounginxBoxAscent = Math.floor(fontBoundingBoxAscent / 2);

      const fontColor = this.theme.headerFontColor ?? this.theme.fontColor;

      const clipRegion = pathFromRect(this.layout.headerRect);

      for (
        let columnIndex = this.layout.columnStart;
        columnIndex < this.layout.columnEnd;
        columnIndex++
      ) {
        const columnState = this.columnStates[columnIndex];

        const canonicalColumnPos = this.layout.canonicalColumnPositions[columnIndex];
        const screenColumnPos = this.calcScreenX(canonicalColumnPos);

        const x = screenColumnPos + this.theme.cellPadding;
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

      const clipRegion = pathFromRect(this.layout.bodyRect);

      for (
        let columnIndex = this.layout.columnStart;
        columnIndex < this.layout.columnEnd;
        columnIndex++
      ) {
        const columnState = this.columnStates[columnIndex];

        const canonicalColumnPos = this.layout.canonicalColumnPositions[columnIndex]!;
        const screenColumnPos = this.calcScreenX(canonicalColumnPos);

        const x = screenColumnPos + this.theme.cellPadding;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;

        for (let rowIndex = this.layout.rowStart; rowIndex < this.layout.rowEnd; rowIndex++) {
          const dataRow = this.dataRows[rowIndex];

          const canonicalRowPos = rowIndex * this.theme.rowHeight;
          const screenRowPos = this.calcScreenY(canonicalRowPos) + this.theme.rowHeight;

          const y = screenRowPos + this.theme.rowHeight / 2 + halfFontBoundingBoxAscent;

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
            clipRegion
          });
        }
      }
    }

    this.renderer.render(ctx, stageSize);
  }

  reflow() {
    this.updateMainLayout();
    this.updateScrollbarThumbPositions();
    this.updateViewportLayout();
  }

  updateMainLayout() {
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

    const hsbTrackX = hsbX + scrollbarTrackMargin;
    const hsbTrackY = hsbY + scrollbarTrackMargin;
    const hsbTrackWidth = hsbWidth - scrollbarTrackMargin * 2;
    const hsbTrackHeight = hsbHeight - scrollbarTrackMargin * 2;

    const hsbThumbWidth = Math.max((bodyWidth / scrollWidth) * hsbTrackWidth, MIN_THUMB_LENGTH);
    const hsbThumbMaxX = hsbTrackX + hsbTrackWidth - hsbThumbWidth;

    const vsbX = tableWidth + 1;
    const vsbY = rowHeight + 1;
    const vsbWidth = scrollbarThickness;
    const vsbHeight = bodyHeight - 1;

    const vsbTrackX = vsbX + scrollbarTrackMargin;
    const vsbTrackY = vsbY + scrollbarTrackMargin;
    const vsbTrackWidth = vsbWidth - scrollbarTrackMargin * 2;
    const vsbTrackHeight = vsbHeight - scrollbarTrackMargin * 2;

    const vsbThumbHeight = Math.max((bodyHeight / scrollHeight) * vsbTrackHeight, MIN_THUMB_LENGTH);
    const vsbThumbMaxY = vsbTrackY + vsbTrackHeight - vsbThumbHeight;

    this.layout.contentWidth = contentWidth;
    this.layout.contentHeight = contentHeight;
    this.layout.tableRect = tableRect;
    this.layout.bodyRect = bodyRect;
    this.layout.headerRect = headerRect;
    this.layout.scrollWidth = scrollWidth;
    this.layout.scrollHeight = scrollHeight;
    this.layout.maxScrollX = maxScrollX;
    this.layout.maxScrollY = maxScrollY;
    this.layout.gridWidth = gridWidth;
    this.layout.gridHeight = gridHeight;
    this.layout.hsbRect.x = hsbX;
    this.layout.hsbRect.y = hsbY;
    this.layout.hsbRect.width = hsbWidth;
    this.layout.hsbRect.height = hsbHeight;
    this.layout.hsbTrackRect.x = hsbTrackX;
    this.layout.hsbTrackRect.y = hsbTrackY;
    this.layout.hsbTrackRect.width = hsbTrackWidth;
    this.layout.hsbTrackRect.height = hsbTrackHeight;
    this.layout.hsbThumbRect.y = hsbTrackY;
    this.layout.hsbThumbRect.width = hsbThumbWidth;
    this.layout.hsbThumbRect.height = hsbTrackHeight;
    this.layout.hsbThumbMinX = hsbTrackX;
    this.layout.hsbThumbMaxX = hsbThumbMaxX;
    this.layout.vsbRect.x = vsbX;
    this.layout.vsbRect.y = vsbY;
    this.layout.vsbRect.width = vsbWidth;
    this.layout.vsbRect.height = vsbHeight;
    this.layout.vsbTrackRect.x = vsbTrackX;
    this.layout.vsbTrackRect.y = vsbTrackY;
    this.layout.vsbTrackRect.width = vsbTrackWidth;
    this.layout.vsbTrackRect.height = vsbTrackHeight;
    this.layout.vsbThumbRect.x = vsbTrackX;
    this.layout.vsbThumbRect.width = vsbTrackWidth;
    this.layout.vsbThumbRect.height = vsbThumbHeight;
    this.layout.vsbThumbMinY = vsbTrackY;
    this.layout.vsbThumbMaxY = vsbThumbMaxY;
    this.layout.overflowX = overflowX;
    this.layout.overflowY = overflowY;
  }

  updateViewportLayout() {
    let columnStart = 0;
    let columnPos = 0;
    const canonicalColumnPositions = [];

    for (; columnStart < this.columnStates.length; columnStart++) {
      const columnState = this.columnStates[columnStart];
      const nextColumnPos = columnPos + columnState.width;
      if (nextColumnPos > this.scrollPos.x) {
        break;
      }
      canonicalColumnPositions.push(columnPos);
      columnPos = nextColumnPos;
    }

    const scrollRight = this.scrollPos.x + this.layout.bodyRect.width;

    let columnEnd = columnStart;
    for (; columnEnd < this.columnStates.length; columnEnd++) {
      if (columnPos >= scrollRight) {
        break;
      }
      canonicalColumnPositions.push(columnPos);
      columnPos += this.columnStates[columnEnd].width;
    }

    const rowStart = Math.floor(this.scrollPos.y / this.theme.rowHeight);

    const scrollBottom = this.scrollPos.y + this.layout.bodyRect.height;
    const rowEnd = Math.min(Math.ceil(scrollBottom / this.theme.rowHeight), this.dataRows.length);

    this.layout.columnStart = columnStart;
    this.layout.columnEnd = columnEnd;
    this.layout.rowStart = rowStart;
    this.layout.rowEnd = rowEnd;
    this.layout.canonicalColumnPositions = canonicalColumnPositions;
  }

  updateScrollbarThumbPositions() {
    const {
      hsbThumbRect,
      hsbThumbMinX,
      hsbThumbMaxX,
      vsbThumbRect,
      vsbThumbMinY,
      vsbThumbMaxY,
      maxScrollX,
      maxScrollY
    } = this.layout;

    hsbThumbRect.x = scale(this.scrollPos.x, 0, maxScrollX, hsbThumbMinX, hsbThumbMaxX);
    vsbThumbRect.y = scale(this.scrollPos.y, 0, maxScrollY, vsbThumbMinY, vsbThumbMaxY);
  }

  createLayout(): Layout {
    return {
      tableRect: createRect(),
      bodyRect: createRect(),
      headerRect: createRect(),
      scrollWidth: 1,
      scrollHeight: 1,
      contentWidth: 1,
      contentHeight: 1,
      gridWidth: 1,
      gridHeight: 1,
      maxScrollX: 0,
      maxScrollY: 0,
      hsbRect: createRect(),
      hsbTrackRect: createRect(),
      hsbThumbRect: createRect(),
      hsbThumbMinX: 0,
      hsbThumbMaxX: 0,
      vsbRect: createRect(),
      vsbTrackRect: createRect(),
      vsbThumbRect: createRect(),
      vsbThumbMinY: 0,
      vsbThumbMaxY: 0,
      overflowX: false,
      overflowY: false,
      columnStart: 0,
      columnEnd: 0,
      rowStart: 0,
      rowEnd: 0,
      canonicalColumnPositions: []
    };
  }

  doColumnResizer() {
    const { headerRect, columnStart, columnEnd } = this.layout;

    const clipRegion = pathFromRect(headerRect);

    if (this.ui.isActive("column-resizer")) {
      this.doOneColumnResizer(this.ui.active!, clipRegion);
      return;
    }

    for (let columnIndex = columnStart; columnIndex < columnEnd; columnIndex++) {
      const id = UiContext.createId("column-resizer", columnIndex);
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
      ...props.rect
    });
  }

  onDragHorizontalScrollbar(pos: Vector) {
    const { maxScrollX, hsbTrackRect, hsbThumbMinX, hsbThumbMaxX } = this.layout;

    pos.y = hsbTrackRect.y;

    const hsbThumbX = clamp(pos.x, hsbThumbMinX, hsbThumbMaxX);
    pos.x = hsbThumbX;

    const newScrollX = Math.round(scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX));
    this.scrollPos.x = newScrollX;

    this.updateViewportLayout();
  }

  onDragVerticalScrollbar(pos: Vector) {
    const { maxScrollY, vsbTrackRect, vsbThumbMinY, vsbThumbMaxY } = this.layout;

    pos.x = vsbTrackRect.x;

    const vsbThumbY = clamp(pos.y, vsbThumbMinY, vsbThumbMaxY);
    pos.y = vsbThumbY;

    const newScrollY = Math.round(scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY));
    this.scrollPos.y = newScrollY;

    this.updateViewportLayout();
  }

  onDragColumnResizer(id: UiId, pos: Vector) {
    const { x: scrollX } = this.scrollPos;
    const { maxScrollX, maxScrollY, canonicalColumnPositions } = this.layout;

    pos.y = 1;

    const columnIndex = id.index!;

    const columnState = this.columnStates[columnIndex];
    const canonicalColumnPosition = canonicalColumnPositions[columnIndex];
    const screenColumnPos = canonicalColumnPosition - scrollX;

    const calculatedColumnWidth = pos.x - screenColumnPos + COLUMN_RESIZER_LEFT_WIDTH;
    const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
    const columnWidthChanged = columnWidth !== columnState.width;
    columnState.width = columnWidth;

    this.updateMainLayout();

    this.scrollPos.x = Math.min(this.scrollPos.x, maxScrollX);
    this.scrollPos.y = Math.min(this.scrollPos.y, maxScrollY);

    this.updateScrollbarThumbPositions();
    this.updateViewportLayout();

    const rect = this.calculateColumnResizerRect(columnIndex);
    pos.x = rect.x;

    if (this.onResizeColumn && columnWidthChanged) {
      this.onResizeColumn(columnState.key, columnState.width);
    }
  }

  calculateColumnResizerRect(columnIndex: number) {
    const { x: scrollX } = this.scrollPos;
    const { scrollWidth, canonicalColumnPositions } = this.layout;

    const canonicalColumnLeft = canonicalColumnPositions[columnIndex];
    const screenColumnLeft = canonicalColumnLeft - scrollX;
    const screenColumnRight = screenColumnLeft + this.columnStates[columnIndex].width;

    const screenScrollEnd = this.calcScreenX(scrollWidth);

    const calculatedResizerRight = screenColumnRight + COLUMN_RESIZER_LEFT_WIDTH + 1;
    const resizerRight = Math.min(calculatedResizerRight, screenScrollEnd);
    const resizerLeft = resizerRight - COLUMN_RESIZER_WIDTH;

    const rect = {
      x: resizerLeft,
      y: 1,
      width: COLUMN_RESIZER_WIDTH,
      height: this.theme.rowHeight - 1
    };

    return rect;
  }

  calculateRowRect(layout: Layout, rowIndex: number) {
    const { rowHeight } = this.theme;
    const { gridWidth } = layout;

    const canonicalRowPos = rowIndex * rowHeight;
    const screenRowPos = this.calcScreenY(canonicalRowPos) + rowHeight;

    return {
      x: 0,
      y: screenRowPos,
      width: gridWidth,
      height: rowHeight
    };
  }

  calcScreenPos(canonicalPos: Vector) {
    return createVector(this.calcScreenX(canonicalPos.x), this.calcScreenY(canonicalPos.y));
  }

  calcScreenX(canonicalX: number) {
    return canonicalX - this.scrollPos.x;
  }

  calcScreenY(canonicalY: number) {
    return canonicalY - this.scrollPos.y;
  }

  calcCanonicalPos(screenPos: Vector) {
    return createVector(this.calcCanonicalX(screenPos.x), this.calcCanonicalY(screenPos.y));
  }

  calcCanonicalX(screenX: number) {
    return screenX + this.scrollPos.x;
  }

  calcCanonicalY(screenY: number) {
    return screenY + this.scrollPos.y;
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

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
  IdSelector,
  SelectRowCallback,
  DraggableProps,
  RowProps,
  Size,
  ResizeColumnCallback,
  PropSelector,
  DataRowId,
  PropValue,
  TableEvent,
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

    this.selectProp =
      params.selectProp ?? ((row, key) => row[key] as PropValue);

    this.eventQueue = [];

    this.stage.run();
  }

  setColumnDefs(columnDefs: ColumnDef[]) {
    this.eventQueue.push({
      type: "columnDefsChange",
      columnDefs,
      requiresReflow: true,
    });
  }

  setDataRows(dataRows: DataRow[]) {
    this.eventQueue.push({
      type: "dataRowsChange",
      dataRows,
      requiresReflow: true,
    });
  }

  setTheme(theme: Theme) {
    this.eventQueue.push({
      type: "themeChange",
      theme,
      requiresReflow: true,
    });
  }

  setSize(size: Size) {
    this.eventQueue.push({
      type: "sizeChange",
      size,
      requiresReflow: true,
    });
  }

  cleanup() {
    this.stage.cleanup();
  }

  update() {
    if (!this.layout) {
      this.layout = {} as Layout;
      this.reflow();
    }

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;

      switch (event.type) {
        case "columnDefsChange":
          this.columnStates = CanvasTable.columnDefsToColumnStates(
            event.columnDefs,
          );
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

    if (this.ui.active === null) {
      this.scrollPos.x += this.stage.scrollAmount.x;
      this.scrollPos.y += this.stage.scrollAmount.y;
    }

    {
      const { maxScrollX, maxScrollY } = this.layout;

      const newScrollX = clamp(this.scrollPos.x, 0, maxScrollX);
      const newScrollY = clamp(this.scrollPos.y, 0, maxScrollY);
      if (newScrollX !== this.scrollPos.x || newScrollY !== this.scrollPos.y) {
        this.scrollPos.x = newScrollX;
        this.scrollPos.y = newScrollY;
        this.calculateViewportLayout(this.layout);
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
        color: this.theme.tableBackgroundColor,
      });
    }

    if (this.theme.bodyBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.bodyBackgroundColor,
        ...this.layout.bodyRect,
      });
    }

    if (this.theme.headerBackgroundColor) {
      this.renderer.submit({
        type: "rect",
        color: this.theme.headerBackgroundColor,
        ...this.layout.headerRect,
      });
    }

    this.doColumnResizer();

    if (this.layout.overflowX) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.layout.hsbRect,
        });
      }

      {
        const id = UiContext.idFromArgs("horizontal-scrollbar-thumb");

        this.doDraggable({
          id,
          rect: this.layout.hsbThumbRect,
          onDrag: (_id, pos) => this.onDragHorizontalScrollbar(pos),
          activeColor: this.theme.scrollbarThumbPressedColor,
          hotColor: this.theme.scrollbarThumbHoverColor,
          color: this.theme.scrollbarThumbColor,
        });
      }
    }

    if (this.layout.overflowY) {
      if (this.theme.scrollbarTrackColor) {
        this.renderer.submit({
          type: "rect",
          color: this.theme.scrollbarTrackColor,
          ...this.layout.vsbRect,
        });
      }

      {
        const id = UiContext.idFromArgs("vertical-scrollbar-thumb");

        this.doDraggable({
          id,
          rect: this.layout.vsbThumbRect,
          onDrag: (_id, pos) => this.onDragVerticalScrollbar(pos),
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
    if (this.layout.overflowX) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.layout.hsbRect.y - 1,
        length: stageSize.width,
        color: this.theme.tableBorderColor,
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: this.layout.gridWidth,
        y: 0,
        length: this.layout.gridHeight,
        color: this.theme.tableBorderColor,
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
        color: this.theme.tableBorderColor,
      });
    } else {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.layout.gridHeight,
        length: this.layout.gridWidth,
        color: this.theme.tableBorderColor,
      });
    }

    // Draw grid horizontal lines
    for (
      let rowIndex = this.layout.rowStart + 1;
      rowIndex < this.layout.rowEnd;
      rowIndex++
    ) {
      const canonicalRowPos = rowIndex * this.theme.rowHeight;
      const screenRowPos =
        this.calcScreenY(canonicalRowPos) + this.theme.rowHeight;

      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: screenRowPos,
        length: this.layout.gridWidth,
        color: this.theme.tableBorderColor,
      });
    }

    // Draw grid vertical lines
    for (
      let columnIndex = this.layout.columnStart + 1;
      columnIndex < this.layout.columnEnd;
      columnIndex++
    ) {
      const canonicalColumnPos =
        this.layout.canonicalColumnPositions[columnIndex]!;
      const screenColumnPos = this.calcScreenX(canonicalColumnPos);

      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: screenColumnPos,
        y: 0,
        length: this.layout.gridHeight,
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

      const clipRegion = pathFromRect(this.layout.headerRect);

      for (
        let columnIndex = this.layout.columnStart;
        columnIndex < this.layout.columnEnd;
        columnIndex++
      ) {
        const columnState = this.columnStates[columnIndex];

        const canonicalColumnPos =
          this.layout.canonicalColumnPositions[columnIndex];
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

      const clipRegion = pathFromRect(this.layout.bodyRect);

      for (
        let columnIndex = this.layout.columnStart;
        columnIndex < this.layout.columnEnd;
        columnIndex++
      ) {
        const columnState = this.columnStates[columnIndex];

        const canonicalColumnPos =
          this.layout.canonicalColumnPositions[columnIndex]!;
        const screenColumnPos = this.calcScreenX(canonicalColumnPos);

        const x = screenColumnPos + this.theme.cellPadding;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;

        for (
          let rowIndex = this.layout.rowStart;
          rowIndex < this.layout.rowEnd;
          rowIndex++
        ) {
          const dataRow = this.dataRows[rowIndex];

          const canonicalRowPos = rowIndex * this.theme.rowHeight;
          const screenRowPos =
            this.calcScreenY(canonicalRowPos) + this.theme.rowHeight;

          const y =
            screenRowPos + this.theme.rowHeight / 2 + halfFontBoundingBoxAscent;

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

  reflow() {
    this.calculateMainLayout(this.layout);
    this.calculateViewportLayout(this.layout);
  }

  calculateMainLayout(layout: Layout) {
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

    layout.contentWidth = contentWidth;
    layout.contentHeight = contentHeight;
    layout.tableRect = tableRect;
    layout.bodyRect = bodyRect;
    layout.headerRect = headerRect;
    layout.scrollWidth = scrollWidth;
    layout.scrollHeight = scrollHeight;
    layout.maxScrollX = maxScrollX;
    layout.maxScrollY = maxScrollY;
    layout.gridWidth = gridWidth;
    layout.gridHeight = gridHeight;
    layout.hsbRect = hsbRect;
    layout.hsbTrackRect = hsbTrackRect;
    layout.hsbThumbRect = hsbThumbRect;
    layout.hsbThumbMinX = hsbThumbMinX;
    layout.hsbThumbMaxX = hsbThumbMaxX;
    layout.vsbRect = vsbRect;
    layout.vsbTrackRect = vsbTrackRect;
    layout.vsbThumbRect = vsbThumbRect;
    layout.vsbThumbMinY = vsbThumbMinY;
    layout.vsbThumbMaxY = vsbThumbMaxY;
    layout.overflowX = overflowX;
    layout.overflowY = overflowY;
  }

  calculateViewportLayout(layout: Layout) {
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

    const scrollRight = this.scrollPos.x + layout.bodyRect.width;

    let columnEnd = columnStart;
    for (; columnEnd < this.columnStates.length; columnEnd++) {
      if (columnPos >= scrollRight) {
        break;
      }
      canonicalColumnPositions.push(columnPos);
      columnPos += this.columnStates[columnEnd].width;
    }

    const rowStart = Math.floor(this.scrollPos.y / this.theme.rowHeight);

    const scrollBottom = this.scrollPos.y + layout.bodyRect.height;
    const rowEnd = Math.min(
      Math.ceil(scrollBottom / this.theme.rowHeight),
      this.dataRows.length,
    );

    layout.columnStart = columnStart;
    layout.columnEnd = columnEnd;
    layout.rowStart = rowStart;
    layout.rowEnd = rowEnd;
    layout.canonicalColumnPositions = canonicalColumnPositions;
  }

  doColumnResizer() {
    const { headerRect, columnStart, columnEnd } = this.layout;

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
    const clipRegion = this.pathFromRect(this.layout.bodyRect);

    for (
      let rowIndex = this.layout.rowStart;
      rowIndex < this.layout.rowEnd;
      rowIndex++
    ) {
      const id = UiContext.idFromArgs("row", rowIndex);
      const rect = this.calculateRowRect(this.layout, rowIndex);

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
      const insideBody = this.stage.isMouseInRect(this.layout.bodyRect);
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
      this.layout;

    pos.y = hsbTrackRect.y;

    const hsbThumbX = clamp(pos.x, hsbThumbMinX, hsbThumbMaxX);
    pos.x = hsbThumbX;

    const newScrollX = Math.round(
      scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX),
    );
    this.scrollPos.x = newScrollX;

    this.calculateViewportLayout(this.layout);
  }

  onDragVerticalScrollbar(pos: Vector) {
    const { maxScrollY, vsbTrackRect, vsbThumbMinY, vsbThumbMaxY } =
      this.layout;

    pos.x = vsbTrackRect.x;

    const vsbThumbY = clamp(pos.y, vsbThumbMinY, vsbThumbMaxY);
    pos.y = vsbThumbY;

    const newScrollY = Math.round(
      scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY),
    );
    this.scrollPos.y = newScrollY;

    this.calculateViewportLayout(this.layout);
  }

  onDragColumnResizer(id: UiId, pos: Vector) {
    const { x: scrollX } = this.scrollPos;
    const { maxScrollX, maxScrollY, canonicalColumnPositions } = this.layout;

    pos.y = 1;

    const columnIndex = id.index!;

    const columnState = this.columnStates[columnIndex];
    const canonicalColumnPosition = canonicalColumnPositions[columnIndex];
    const screenColumnPos = canonicalColumnPosition - scrollX;

    const calculatedColumnWidth =
      pos.x - screenColumnPos + COLUMN_RESIZER_LEFT_WIDTH;
    const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
    const columnWidthChanged = columnWidth !== columnState.width;
    columnState.width = columnWidth;

    this.calculateMainLayout(this.layout);

    this.scrollPos.x = Math.min(this.scrollPos.x, maxScrollX);
    this.scrollPos.y = Math.min(this.scrollPos.y, maxScrollY);

    this.calculateViewportLayout(this.layout);

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
    const screenColumnRight =
      screenColumnLeft + this.columnStates[columnIndex].width;

    const screenScrollEnd = this.calcScreenX(scrollWidth);

    const calculatedResizerRight =
      screenColumnRight + COLUMN_RESIZER_LEFT_WIDTH + 1;
    const resizerRight = Math.min(calculatedResizerRight, screenScrollEnd);
    const resizerLeft = resizerRight - COLUMN_RESIZER_WIDTH;

    const rect = {
      x: resizerLeft,
      y: 1,
      width: COLUMN_RESIZER_WIDTH,
      height: this.theme.rowHeight - 1,
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
      height: rowHeight,
    };
  }

  calcScreenPos(canonicalPos: Vector) {
    return createVector(
      this.calcScreenX(canonicalPos.x),
      this.calcScreenY(canonicalPos.y),
    );
  }

  calcScreenX(canonicalX: number) {
    return canonicalX - this.scrollPos.x;
  }

  calcScreenY(canonicalY: number) {
    return canonicalY - this.scrollPos.y;
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

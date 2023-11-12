import { Stage } from "./lib/Stage";
import { Layout } from "./lib/Layout";
import { Renderer } from "./lib/Renderer";
import { UiContext, UiId } from "./lib/UiContext";
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
  shallowMerge
} from "./utils";
import {
  COLUMN_RESIZER_LEFT_WIDTH,
  COLUMN_RESIZER_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH
} from "./constants";
import {
  CreateCanvasTableParams,
  ConfigCanvasTableParams,
  ColumnDef,
  ColumnState,
  DataRow,
  Theme,
  Rect,
  Vector,
  IdSelector,
  SelectRowCallback,
  EditCellCallback,
  ColumnResizeCallback,
  DraggableProps,
  Size,
  PropSelector,
  DataRowId,
  PropValue,
  TableEvent
} from "./types";

export class CanvasTable {
  stage: Stage;
  renderer: Renderer;
  ui: UiContext;

  columnStates: ColumnState[];
  dataRows: DataRow[];
  theme: Theme;

  selectedRowId: DataRowId | null;

  selectedRowIndex: number;
  selectedColumnIndex: number;

  selectId: IdSelector;
  selectProp: PropSelector;

  onSelectRow?: SelectRowCallback;
  onEditCell?: EditCellCallback;
  onResizeColumn?: ColumnResizeCallback;

  eventQueue: TableEvent[];

  layout: Layout = undefined!;

  mouseCol: number;
  mouseRow: number;

  cellInput: HTMLInputElement | null;

  constructor(params: CreateCanvasTableParams) {
    this.stage = new Stage(params.container, params.size);
    this.stage.setUpdateFunction(this.update.bind(this));

    this.renderer = new Renderer();
    this.ui = new UiContext();

    this.columnStates = CanvasTable.columnDefsToColumnStates(params.columnDefs);
    this.dataRows = params.dataRows;
    this.theme = params?.theme ?? defaultTheme;
    this.selectedRowId = null;

    this.selectedRowIndex = -1;
    this.selectedColumnIndex = -1;

    this.onSelectRow = params.onSelectRow;
    this.onEditCell = params.onEditCell;
    this.onResizeColumn = params.onResizeColumn;

    this.selectId = params?.selectId ?? ((row) => row.id as DataRowId);

    this.selectProp = params.selectProp ?? ((row, key) => row[key] as PropValue);

    this.eventQueue = [];

    this.mouseCol = -1;
    this.mouseRow = -1;

    this.cellInput = null;

    this.stage.run();
  }

  setColumnDefs(columnDefs: ColumnDef[]) {
    this.eventQueue.push({ type: "columnDefsChange", columnDefs });
  }

  setDataRows(dataRows: DataRow[]) {
    this.eventQueue.push({ type: "dataRowsChange", dataRows });
  }

  setTheme(theme: Theme) {
    this.eventQueue.push({ type: "themeChange", theme });
  }

  setSize(size: Size) {
    this.eventQueue.push({ type: "sizeChange", size });
  }

  config(params: Partial<ConfigCanvasTableParams>) {
    const { columnDefs, dataRows, theme, size, ...rest } = params;
    if (columnDefs !== undefined) this.setColumnDefs(columnDefs);
    if (dataRows !== undefined) this.setDataRows(dataRows);
    if (theme) this.setTheme(theme);
    if (size) this.setSize(size);
    shallowMerge(this, rest);
  }

  cleanup() {
    this.stage.cleanup();
  }

  update() {
    if (!this.layout) {
      this.layout = new Layout(this);
      this.layout.reflow();
    }

    let shouldReflow = false;
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;

      switch (event.type) {
        case "columnDefsChange":
          this.columnStates = CanvasTable.columnDefsToColumnStates(event.columnDefs);
          shouldReflow = true;
          break;
        case "dataRowsChange":
          this.dataRows = event.dataRows;
          shouldReflow = true;
          break;
        case "themeChange":
          this.theme = event.theme;
          shouldReflow = true;
          break;
        case "sizeChange":
          this.stage.setSize(event.size);
          shouldReflow = true;
          break;
      }
    }

    if (shouldReflow) {
      this.layout.reflow();
    }

    {
      const newScrollPos = createVector(this.layout.scrollPos);

      if (this.ui.active === null) {
        newScrollPos.x += this.stage.scrollAmount.x;
        newScrollPos.y += this.stage.scrollAmount.y;
      }

      const { maxScrollX, maxScrollY } = this.layout;

      newScrollPos.x = clamp(newScrollPos.x, 0, maxScrollX);
      newScrollPos.y = clamp(newScrollPos.y, 0, maxScrollY);
      if (
        newScrollPos.x !== this.layout.scrollPos.x ||
        newScrollPos.y !== this.layout.scrollPos.y
      ) {
        this.scrollTo(newScrollPos);
      }
    }

    this.mouseCol = -1;
    this.mouseRow = -1;

    {
      const { gridWidth, gridHeight } = this.layout;
      const gridRect = createRect({ width: gridWidth, height: gridHeight });

      if (this.stage.isMouseInRect(gridRect)) {
        const { x: mouseX, y: mouseY } = this.stage.currentMousePosition;
        const { rowHeight } = this.theme;

        for (const columnIndex of this.layout.colRange()) {
          const columnState = this.columnStates[columnIndex];

          const screenColumnLeft = this.layout.getScreenColPos(columnIndex);
          const screenColumnRight = screenColumnLeft + columnState.width;
          if (mouseX >= screenColumnLeft && mouseX < screenColumnRight) {
            this.mouseCol = columnIndex;
            break;
          }
        }

        this.mouseRow = Math.floor(
          (this.layout.screenToCanonicalY(mouseY) - rowHeight) / rowHeight
        );
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
      const dataRow = this.dataRows[this.mouseRow];
      if (this.stage.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
        const dataRowId = this.selectId(dataRow);
        this.selectedRowId = dataRowId;

        if (this.cellInput) {
          this.cellInput!.remove();
        }

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
        if (this.stage.isMouseDoubleClicked(Stage.MOUSE_BUTTONS.PRIMARY)) {
          this.selectedRowIndex = this.mouseRow;
          this.selectedColumnIndex = this.mouseCol;

          this.layout.scrollSuchThatCellIsVisible(this.mouseRow, this.mouseCol);
          this.showCellInput(this.mouseRow, this.mouseCol);
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
    for (const rowIndex of this.layout.rowRange(1)) {
      this.renderer.submit({
        type: "line",
        orientation: "horizontal",
        x: 0,
        y: this.layout.getScreenRowPos(rowIndex),
        length: this.layout.gridWidth,
        color: this.theme.tableBorderColor
      });
    }

    // Draw grid vertical lines
    for (const columnIndex of this.layout.colRange(1)) {
      this.renderer.submit({
        type: "line",
        orientation: "vertical",
        x: this.layout.getScreenColPos(columnIndex),
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

      for (const columnIndex of this.layout.colRange()) {
        const columnState = this.columnStates[columnIndex];

        const screenColumnPos = this.layout.getScreenColPos(columnIndex);

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

      for (const columnIndex of this.layout.colRange()) {
        const columnState = this.columnStates[columnIndex];

        const screenColumnPos = this.layout.getScreenColPos(columnIndex);

        const x = screenColumnPos + this.theme.cellPadding;
        const maxWidth = columnState.width - this.theme.cellPadding * 2;

        for (const rowIndex of this.layout.rowRange()) {
          const dataRow = this.dataRows[rowIndex];

          const screenRowPos = this.layout.getScreenRowPos(rowIndex);

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

  scrollTo(scrollPos: Vector) {
    this.layout.scrollTo(scrollPos);

    if (this.cellInput) {
      const screenColumnPosition = this.layout.getScreenColPos(this.selectedColumnIndex);
      const screenRowPosition = this.layout.getScreenRowPos(this.selectedRowIndex);

      const cellX = screenColumnPosition + 1;
      const cellY = screenRowPosition + 1;

      const style = {
        left: cellX + "px",
        top: cellY + "px"
      };

      Object.assign(this.cellInput.style, style);
    }
  }

  createCellInput() {
    this.cellInput = document.createElement("input");

    this.cellInput.style.position = "absolute";
    this.cellInput.style.border = "none";
    this.cellInput.style.outline = "none";

    return this.cellInput;
  }

  showCellInput(rowIndex: number, columnIndex: number) {
    this.cellInput = this.createCellInput();

    const columnState = this.columnStates[columnIndex];

    const dataRow = this.dataRows[rowIndex];
    const value = dataRow[columnState.key] as string;
    this.cellInput.value = value;

    this.cellInput.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        this.onEditCell?.(columnState.key, this.cellInput!.value);
        this.cellInput!.remove();
        this.cellInput = null;
      }
      if (event.key === "Escape") {
        this.cellInput!.remove();
        this.cellInput = null;
      }
    });

    const screenColumnPosition = this.layout.getScreenColPos(columnIndex);
    const screenRowPosition = this.layout.getScreenRowPos(rowIndex);

    const { rowHeight } = this.theme;

    const inputX = screenColumnPosition + 1;
    const inputY = screenRowPosition + 1;
    const inputWidth = columnState.width - 1;
    const inputHeight = rowHeight - 1;

    const style = {
      left: inputX + "px",
      top: inputY + "px",
      width: inputWidth + "px",
      height: inputHeight + "px",
      paddingLeft: this.theme.cellPadding + "px",
      paddingRight: this.theme.cellPadding + "px",
      fontFamily: this.theme.fontFamily,
      fontSize: this.theme.fontSize,
      color: this.theme.fontColor
    };
    Object.assign(this.cellInput.style, style);

    this.stage.relativeEl.appendChild(this.cellInput);

    this.cellInput.focus();
    this.cellInput.scrollLeft = this.cellInput.scrollWidth;
  }

  doColumnResizer() {
    const { headerRect } = this.layout;

    const clipRegion = pathFromRect(headerRect);

    if (this.ui.isActive("column-resizer")) {
      this.doOneColumnResizer(this.ui.active!, clipRegion);
      return;
    }

    for (const columnIndex of this.layout.colRange()) {
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

    const hsbThumbX = clamp(pos.x, hsbThumbMinX, hsbThumbMaxX);
    pos.x = hsbThumbX;
    pos.y = hsbTrackRect.y;

    const newScrollX = Math.round(scale(hsbThumbX, hsbThumbMinX, hsbThumbMaxX, 0, maxScrollX));
    const newScrollPos = createVector(newScrollX, this.layout.scrollPos.y);
    this.scrollTo(newScrollPos);
  }

  onDragVerticalScrollbar(pos: Vector) {
    const { maxScrollY, vsbTrackRect, vsbThumbMinY, vsbThumbMaxY } = this.layout;

    const vsbThumbY = clamp(pos.y, vsbThumbMinY, vsbThumbMaxY);
    pos.y = vsbThumbY;
    pos.x = vsbTrackRect.x;

    const newScrollY = Math.round(scale(vsbThumbY, vsbThumbMinY, vsbThumbMaxY, 0, maxScrollY));
    const newScrollPos = createVector(this.layout.scrollPos.x, newScrollY);
    this.scrollTo(newScrollPos);
  }

  onDragColumnResizer(id: UiId, pos: Vector) {
    const { maxScrollX, maxScrollY } = this.layout;

    pos.y = 1;

    const columnIndex = id.index!;
    const columnState = this.columnStates[columnIndex];

    const screenColumnPos = this.layout.getScreenColPos(columnIndex);
    const calculatedColumnWidth = pos.x - screenColumnPos + COLUMN_RESIZER_LEFT_WIDTH;
    const columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
    const columnWidthChanged = columnWidth !== columnState.width;
    columnState.width = columnWidth;

    this.layout.updateMain();

    const newScrollPos = createVector(
      Math.min(this.layout.scrollPos.x, maxScrollX),
      Math.min(this.layout.scrollPos.y, maxScrollY)
    );
    this.scrollTo(newScrollPos);

    const rect = this.calculateColumnResizerRect(columnIndex);
    pos.x = rect.x;

    if (this.cellInput && columnIndex === this.selectedColumnIndex) {
      this.cellInput.style.width = columnWidth - 1 + "px";
    }

    if (this.onResizeColumn && columnWidthChanged) {
      this.onResizeColumn(columnState.key, columnState.width);
    }
  }

  calculateColumnResizerRect(columnIndex: number) {
    const { x: scrollX } = this.layout.scrollPos;
    const { scrollWidth } = this.layout;

    const canonicalColumnLeft = this.layout.getCanonicalColPos(columnIndex);
    const screenColumnLeft = canonicalColumnLeft - scrollX;
    const screenColumnRight = screenColumnLeft + this.columnStates[columnIndex].width;

    const screenScrollEnd = this.layout.canonicalToScreenX(scrollWidth);

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

    const screenRowPos = this.layout.getScreenRowPos(rowIndex);

    return {
      x: 0,
      y: screenRowPos,
      width: gridWidth,
      height: rowHeight
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
      columnStates.push({ ...rest, width: _width });
    }
    return columnStates;
  }
}

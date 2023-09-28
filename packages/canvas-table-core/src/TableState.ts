import {
  clamp,
  scale,
  createVector,
  createSize,
  createArea
} from "./utils";
import { BORDER_WIDTH } from "./constants";
import {
  ColumnState,
  DataRow,
  Theme,
  VectorLike,
  RectLike,
  Size,
  Overflow,
  TableRanges,
  Grid,
  TextInfo
} from "./types";

export class TableState {
  public scrollPos: VectorLike;
  public maxScrollPos: VectorLike;
  public normalizedScrollPos: VectorLike;

  public contentSize!: Size;
  public scrollSize: Size;
  public viewportSize: Size;
  public normalizedViewportSize: Size;

  public mainArea: RectLike;
  public bodyArea: RectLike;
  public headerArea: RectLike;
  public hsbOuterArea: RectLike;
  public hsbInnerArea: RectLike;
  public vsbOuterArea: RectLike;
  public vsbInnerArea: RectLike;

  public overflow: Overflow;

  public tableRanges: TableRanges;

  public grid: Grid;
  public bodyTextInfo: TextInfo[];
  public headerTextInfo: TextInfo[];

  constructor(
    public columnStates: ColumnState[],
    public dataRows:     DataRow[],
    public theme:        Theme,
    public tableSize:    Size
  ) {
    this.contentSize = this.calculateContentSize();

    this.scrollPos = createVector();
    this.maxScrollPos = createVector();
    this.normalizedScrollPos = createVector();

    this.scrollSize = createSize();
    this.viewportSize = createSize();
    this.normalizedViewportSize = createSize();

    const { rowHeight, scrollbarThickness } = this.theme;

    this.mainArea = createArea();
    this.bodyArea = createArea({ y: rowHeight });
    this.headerArea = createArea({ height: rowHeight });

    this.hsbOuterArea = createArea({ height: scrollbarThickness + BORDER_WIDTH });
    this.vsbOuterArea = createArea({ y: rowHeight, width: scrollbarThickness + BORDER_WIDTH });

    this.hsbInnerArea = createArea({ x: BORDER_WIDTH, height: scrollbarThickness });
    this.vsbInnerArea = createArea({ y: rowHeight + BORDER_WIDTH, width: scrollbarThickness });

    this.overflow = { x: false, y: false };

    this.tableRanges = { columnLeft: 0, columnRight: 0, rowTop: 0, rowBottom: 0 };

    this.grid = this.calculateGrid();
    
    const { bodyTextInfo, headerTextInfo } = this.calculateTextInfo();
    this.bodyTextInfo = bodyTextInfo;
    this.headerTextInfo = headerTextInfo;
  }

  public setContent(columnStates: ColumnState[], dataRows: DataRow[]) {
    this.columnStates = columnStates;
    this.dataRows = dataRows;

    this.contentSize = this.calculateContentSize();
    this.reflow();
    this.grid = this.calculateGrid();

    const { bodyTextInfo, headerTextInfo } = this.calculateTextInfo();
    this.bodyTextInfo = bodyTextInfo;
    this.headerTextInfo = headerTextInfo;
  }

  public setTheme(theme: Theme) {
    this.theme = theme;

    this.contentSize = this.calculateContentSize();
    this.reflow();
    this.grid = this.calculateGrid();

    const { bodyTextInfo, headerTextInfo } = this.calculateTextInfo();
    this.bodyTextInfo = bodyTextInfo;
    this.headerTextInfo = headerTextInfo;
  }

  public setSize(size: Size) {
    this.tableSize = size;

    this.reflow();
    this.grid = this.calculateGrid();

    const { bodyTextInfo, headerTextInfo } = this.calculateTextInfo();
    this.bodyTextInfo = bodyTextInfo;
    this.headerTextInfo = headerTextInfo;
  }

  public setColumnWidth(columnIndex: number, columnWidth: number) {
    const columnState = this.columnStates[columnIndex];
    columnState.width = columnWidth;

    let total = columnState.pos + columnState.width;
    for (let j = columnIndex + 1; j < this.columnStates.length; j++) {
      const columnState = this.columnStates[j];
      columnState.pos = total;
      total += columnState.width;
    }

    this.contentSize = this.calculateContentSize();
    this.reflow();
    this.grid = this.calculateGrid();

    const { bodyTextInfo, headerTextInfo } = this.calculateTextInfo();
    this.bodyTextInfo = bodyTextInfo;
    this.headerTextInfo = headerTextInfo;
  }

  public setScrollPos(scrollPos: VectorLike) {
    this.scrollPos.x = Math.round(clamp(scrollPos.x, 0, this.maxScrollPos.x));
    this.scrollPos.y = Math.round(clamp(scrollPos.y, 0, this.maxScrollPos.y));

    this.normalizedScrollPos.x = this.maxScrollPos.x > 0 ? this.scrollPos.x / this.maxScrollPos.x : 0;
    this.normalizedScrollPos.y = this.maxScrollPos.y > 0 ? this.scrollPos.y / this.maxScrollPos.y : 0;

    this.recalculateTableRanges();
    this.grid = this.calculateGrid();

    const { bodyTextInfo, headerTextInfo } = this.calculateTextInfo();
    this.bodyTextInfo = bodyTextInfo;
    this.headerTextInfo = headerTextInfo;
  }

  public setNormalizedScrollPos(normalizedScrollPos: VectorLike) {
    this.normalizedScrollPos.x = clamp(normalizedScrollPos.x, 0, 1);
    this.normalizedScrollPos.y = clamp(normalizedScrollPos.y, 0, 1);

    this.scrollPos.x = Math.round(scale(this.normalizedScrollPos.x, 0, 1, 0, this.maxScrollPos.x));
    this.scrollPos.y = Math.round(scale(this.normalizedScrollPos.y, 0, 1, 0, this.maxScrollPos.y));

    this.recalculateTableRanges();
    this.grid = this.calculateGrid();

    const { bodyTextInfo, headerTextInfo } = this.calculateTextInfo();
    this.bodyTextInfo = bodyTextInfo;
    this.headerTextInfo = headerTextInfo;
  }

  private reflow() {
    const { rowHeight, scrollbarThickness } = this.theme;

    const outerMainAreaWidth  = this.tableSize.width  - BORDER_WIDTH;
    const outerMainAreaHeight = this.tableSize.height - BORDER_WIDTH;
    const innerMainAreaWidth  = outerMainAreaWidth  - scrollbarThickness - BORDER_WIDTH;
    const innerMainAreaHeight = outerMainAreaHeight - scrollbarThickness - BORDER_WIDTH;

    const outerBodyAreaHeight = outerMainAreaHeight - rowHeight;
    const innerBodyAreaHeight = innerMainAreaHeight - rowHeight;

    if (outerMainAreaWidth >= this.contentSize.width && outerBodyAreaHeight >= this.contentSize.height) {
      this.overflow.x = this.overflow.y = false;
    } else {
      this.overflow.x = innerMainAreaWidth  < this.contentSize.width;
      this.overflow.y = innerBodyAreaHeight < this.contentSize.height;
    }

    if (this.overflow.y) {
      this.mainArea.width = this.bodyArea.width = this.headerArea.width = innerMainAreaWidth;
    } else {
      this.mainArea.width = this.bodyArea.width = this.headerArea.width = outerMainAreaWidth;
    }

    if (this.overflow.x) {
      this.mainArea.height = innerMainAreaHeight;
      this.bodyArea.height = innerBodyAreaHeight;
    } else {
      this.mainArea.height = outerMainAreaHeight;
      this.bodyArea.height = outerBodyAreaHeight;
    }

    this.hsbOuterArea.y     = this.mainArea.height;
    this.hsbOuterArea.width = this.mainArea.width;
    this.hsbInnerArea.y     = this.hsbOuterArea.y     + BORDER_WIDTH;
    this.hsbInnerArea.width = this.hsbOuterArea.width - BORDER_WIDTH;

    this.vsbOuterArea.x      = this.mainArea.width;
    this.vsbOuterArea.height = this.bodyArea.height;
    this.vsbInnerArea.x      = this.vsbOuterArea.x      + BORDER_WIDTH;
    this.vsbInnerArea.height = this.vsbOuterArea.height - BORDER_WIDTH;

    this.viewportSize.width  = this.bodyArea.width;
    this.viewportSize.height = this.bodyArea.height;

    this.scrollSize.width  = Math.max(this.contentSize.width,  this.viewportSize.width);
    this.scrollSize.height = Math.max(this.contentSize.height, this.viewportSize.height);

    this.normalizedViewportSize.width  = this.viewportSize.width  / this.scrollSize.width;
    this.normalizedViewportSize.height = this.viewportSize.height / this.scrollSize.height;
    
    this.maxScrollPos.x = this.scrollSize.width  - this.viewportSize.width;
    this.maxScrollPos.y = this.scrollSize.height - this.viewportSize.height;

    this.scrollPos.x = Math.round(clamp(this.scrollPos.x, 0, this.maxScrollPos.x));
    this.scrollPos.y = Math.round(clamp(this.scrollPos.y, 0, this.maxScrollPos.y));

    this.normalizedScrollPos.x = this.maxScrollPos.x > 0 ? this.scrollPos.x / this.maxScrollPos.x : 0;
    this.normalizedScrollPos.y = this.maxScrollPos.y > 0 ? this.scrollPos.y / this.maxScrollPos.y : 0;

    this.recalculateTableRanges();
  }

  private calculateGrid() {
    const { rowTop, rowBottom, columnLeft, columnRight } = this.tableRanges;
    const { rowHeight } = this.theme;

    // @Performance: Pre-allocate the arrays

    const xArray = [];
    {
      const start = rowTop + 1;
      const end = rowBottom; 
      const offset = -this.scrollPos.y + rowHeight;
      for (let i = start; i < end; i++) {
        const y = i * rowHeight + offset;
        xArray.push(y);
      }
    }

    const yArray = [];
    {
      const start = columnLeft + 1;
      const end = columnRight;
      const offset = -this.scrollPos.x;
      for (let j = start; j < end; j++) {
        const columnState = this.columnStates[j];
        const x = columnState.pos + offset;
        yArray.push(x);
      }
    }

    const gridWidth  = Math.min(this.mainArea.width,  this.contentSize.width);
    const gridHeight = Math.min(this.mainArea.height, this.contentSize.height + rowHeight);

    const grid = {
      x: yArray,
      y: xArray,
      width: gridWidth,
      height: gridHeight
    };

    return grid;
  }

  private calculateTextInfo() {
    const { rowTop, rowBottom, columnLeft, columnRight } = this.tableRanges;
    const { rowHeight, cellPadding } = this.theme;

    const halfOfRowHeight = rowHeight / 2;
    const doubleOfCellPadding = cellPadding * 2;

    const xOffset = -this.scrollPos.x + cellPadding;
    const yOffset = -this.scrollPos.y + halfOfRowHeight + rowHeight;

    const bodyTextInfoArray = [];
    for (let i = rowTop; i < rowBottom; i++) {
      const dataRow = this.dataRows[i];
      const y = i * rowHeight + yOffset;

      for (let j = columnLeft; j < columnRight; j++) {
        const columnState = this.columnStates[j];
        const x = columnState.pos + xOffset;
        const maxWidth = columnState.width - doubleOfCellPadding;
        const text = dataRow[columnState.field];

        const bodytextInfo = { x, y, maxWidth, text };
        bodyTextInfoArray.push(bodytextInfo);
      }
    }

    const headerTextInfoArray = [];
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.columnStates[j];
      const x = columnState.pos + xOffset;
      const y = halfOfRowHeight;
      const maxWidth = columnState.width - doubleOfCellPadding;
      const text = columnState.title;

      const headerTextInfo = { x, y, maxWidth, text };
      headerTextInfoArray.push(headerTextInfo);
    }

    return {
      bodyTextInfo: bodyTextInfoArray,
      headerTextInfo: headerTextInfoArray
    };
  }

  private calculateContentSize() {
    const { rowHeight } = this.theme;

    const lastColumnStateIndex = this.columnStates.length - 1;
    const lastColumnState = this.columnStates[lastColumnStateIndex];
    const contentWidth = lastColumnState.pos + lastColumnState.width;
    const contentHeight = this.dataRows.length * rowHeight;

    return { width: contentWidth, height: contentHeight };
  }

  private recalculateTableRanges() {
    const { x: scrollLeft, y: scrollTop } = this.scrollPos;
    const { width: viewportWidth, height: viewportHeight } = this.viewportSize;

    const { rowHeight } = this.theme;

    const scrollRight  = scrollLeft + viewportWidth;
    const scrollBottom = scrollTop  + viewportHeight;

    let columnLeft = this.findColumnIndexAtPosition(scrollLeft);
    if (columnLeft === -1) columnLeft = 0;

    let columnRight = this.findColumnIndexAtPosition(scrollRight, columnLeft);
    columnRight = columnRight !== -1 ? columnRight + 1 : this.columnStates.length;

    const rowTop = Math.floor(scrollTop / rowHeight);
    const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), this.dataRows.length);

    this.tableRanges.columnLeft  = columnLeft;
    this.tableRanges.columnRight = columnRight;
    this.tableRanges.rowTop      = rowTop;
    this.tableRanges.rowBottom   = rowBottom;
  }

  private findColumnIndexAtPosition(x: number, start = 0) {
    if (start < 0 || start >= this.columnStates.length) {
      throw new Error("Index out of bounds");
    }

    if (x >= this.contentSize.width) return -1;
    if (x < 0) return -1;
    if (x === 0) return 0;

    let index = start;
    for (; index < this.columnStates.length; index++) {
      const columnState = this.columnStates[index];
      if (columnState.pos >= x) {
        break;
      }
    }

    return index - 1;
  }
}

import { Vector } from "./Vector";
import { defaultTheme } from "./defaultTheme";
import { ColumnState, DataRow, TableRanges, Theme } from "./types";

export class TableState {
  columnStates = [] as ColumnState[];
  dataRows = [] as DataRow[];

  tableRanges = {
    columnLeft: 0,
    columnRight: 0,
    rowTop: 0,
    rowBottom: 0
  }

  scrollPosition           = Vector.zero();
  normalizedScrollPosition = Vector.zero();
  maximumScrollPosition    = Vector.zero();

  tableDimensions    = Vector.unit();
  scrollDimensions   = Vector.unit();
  viewportDimensions = Vector.unit();

  theme = defaultTheme;

  setTableData(columnStates: ColumnState[], dataRows: DataRow[]) {
    this.columnStates = columnStates;
    this.dataRows = dataRows;

    this.tableDimensions = this.calculateTableDimensions();
    this.tableRanges = this.calculateTableRanges();
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setScrollPosition(scrollPosition: Vector) {
    this.scrollPosition = scrollPosition.clamp(Vector.zero(), this.maximumScrollPosition);
    this.normalizedScrollPosition = this.calculateNormalizedScrollPosition(this.scrollPosition);
    this.tableRanges = this.calculateTableRanges();
  }

  setViewportDimensions(viewportDimensions: Vector) {
    this.viewportDimensions = viewportDimensions.copy();
    this.scrollDimensions = this.calculateScrollDimensions();
    this.maximumScrollPosition = this.calculateMaximumScrollPosition();
    this.scrollPosition = this.scrollPosition.min(this.maximumScrollPosition);
    this.tableRanges = this.calculateTableRanges();
  }

  calculateTableRanges(): TableRanges {
    const numOfColumns = this.columnStates.length;
    const numOfRows    = this.dataRows.length;

    const { x: scrollLeft,    y: scrollTop      } = this.scrollPosition;
    const { x: viewportWidth, y: viewportHeight } = this.viewportDimensions;

    const scrollRight  = scrollLeft + viewportWidth;
    const scrollBottom = scrollTop  + viewportHeight;

    let columnLeft = this.findColumnIndexAtXCoordinate(scrollLeft);
    if (columnLeft === -1) columnLeft = 0;

    let columnRight = this.findColumnIndexAtXCoordinate(scrollRight, columnLeft);
    columnRight = columnRight !== -1 ? columnRight + 1 : numOfColumns;

    const { rowHeight } = this.theme;

    const rowTop    = Math.floor(scrollTop / rowHeight);
    const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), numOfRows);

    return {
      columnLeft,
      columnRight,
      rowTop,
      rowBottom
    };
  }

  findColumnIndexAtXCoordinate(x: number, start: number = 0) {
    if (start < 0 || start >= this.columnStates.length) {
      throw new Error("Index is out of bounds");
    }

    const max = this.tableDimensions.x;
    if (x >= max) return -1;
    if (x < 0) return -1;
    if (x == 0) return 0;

    let index = start;
    for (; index < this.columnStates.length; index++) {
      const columnState = this.columnStates[index];
      if (columnState.position >= x) {
        break;
      }
    }

    return index - 1;
  }

  calculateMaximumScrollPosition() {
    const { x: scrollWidth,   y: scrollHeight } = this.scrollDimensions
    const { x: viewportWidth, y: viewportHeight } = this.viewportDimensions;

    const maxScrollLeft = scrollWidth  - viewportWidth;
    const maxScrollTop  = scrollHeight - viewportHeight;

    return new Vector(maxScrollLeft, maxScrollTop);
  }

  calculateTableDimensions() {
    const lastColumnState = this.columnStates[this.columnStates.length - 1];
    const width = lastColumnState.position + lastColumnState.width;

    const { rowHeight } = this.theme;
    const height = this.dataRows.length * rowHeight;

    return new Vector(width, height);
  }

  calculateScrollDimensions() {
    const { x: tableWidth,    y: tableHeight } = this.tableDimensions;
    const { x: viewportWidth, y: viewportHeight } = this.viewportDimensions;

    const scrollWidth  = Math.max(tableWidth, viewportWidth);
    const scrollHeight = Math.max(tableHeight, viewportHeight);
    
    return new Vector(scrollWidth, scrollHeight);
  }

  calculateNormalizedScrollPosition(scrollPosition: Vector) {
    return scrollPosition.div(this.maximumScrollPosition);
  }

  get numOfRows() {
    return this.dataRows.length;
  }

  get numOfCols() {
    return this.columnStates.length;
  }
}

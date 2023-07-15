import { Vector } from "./Vector";
import { defaultTheme } from "./defaultTheme";
import {
  ColumnState,
  DataRow,
  Dimensions,
  TableRanges,
  Theme,
  VectorLike
} from "./types";

export class TableState {
  columnStates = [] as ColumnState[];
  dataRows = [] as DataRow[];

  tableRanges = { columnLeft: 0, columnRight: 0, rowTop: 0, rowBottom: 0 }

  scrollPosition           = { x: 0, y: 0 };
  normalizedScrollPosition = { x: 0, y: 0 };
  maximumScrollPosition    = { x: 0, y: 0 };

  tableDimensions    = { width: 1, height: 1 };
  scrollDimensions   = { width: 1, height: 1 };
  viewportDimensions = { width: 1, height: 1 };

  theme = defaultTheme;

  setTableData(columnStates: ColumnState[], dataRows: DataRow[]) {
    this.columnStates = columnStates;
    this.dataRows = dataRows;

    this.tableDimensions = this.calculateTableDimensions();
    this.tableRanges = this.calculateTableRanges();
  }

  getColumnState(columnIndex: number) {
    const columnState = this.columnStates[columnIndex];
    if (!columnState) {
      throw new Error("Index out of bounds");
    }
    return columnState;
  }

  getDataRow(rowIndex: number) {
    const dataRow = this.dataRows[rowIndex];
    if (!dataRow) {
      throw new Error("Index out of bounds");
    }
    return dataRow;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setScrollPosition(scrollPosition: VectorLike) {
    this.scrollPosition = new Vector(scrollPosition)
      .clamp(Vector.zero(), new Vector(this.maximumScrollPosition))
      .data();

    this.normalizedScrollPosition = this.calculateNormalizedScrollPosition(this.scrollPosition);
    this.tableRanges = this.calculateTableRanges();
  }

  setViewportDimensions(viewportDimensions: Dimensions) {
    this.viewportDimensions =  { ...viewportDimensions };
    this.scrollDimensions = this.calculateScrollDimensions();
    this.maximumScrollPosition = this.calculateMaximumScrollPosition();

    this.scrollPosition = new Vector(this.scrollPosition)
      .min(new Vector(this.maximumScrollPosition))
      .data();

    this.tableRanges = this.calculateTableRanges();
  }

  calculateTableRanges(): TableRanges {
    const { x: scrollLeft, y: scrollTop } = this.scrollPosition;
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;

    const scrollRight  = scrollLeft + viewportWidth;
    const scrollBottom = scrollTop  + viewportHeight;

    let columnLeft = this.findColumnIndexAtXCoordinate(scrollLeft);
    if (columnLeft === -1) columnLeft = 0;

    let columnRight = this.findColumnIndexAtXCoordinate(scrollRight, columnLeft);
    columnRight = columnRight !== -1 ? columnRight + 1 : this.numOfCols;

    const { rowHeight } = this.theme;

    const rowTop    = Math.floor(scrollTop / rowHeight);
    const rowBottom = Math.min(Math.ceil(scrollBottom / rowHeight), this.numOfRows);

    return {
      columnLeft,
      columnRight,
      rowTop,
      rowBottom
    };
  }

  findColumnIndexAtXCoordinate(x: number, start: number = 0) {
    if (start < 0 || start >= this.numOfCols) {
      throw new Error("Index is out of bounds");
    }

    const max = this.tableDimensions.width;
    if (x >= max) return -1;
    if (x < 0) return -1;
    if (x == 0) return 0;

    let index = start;
    for (; index < this.numOfCols; index++) {
      const columnState = this.columnStates[index];
      if (columnState.position >= x) {
        break;
      }
    }

    return index - 1;
  }

  calculateMaximumScrollPosition() {
    const { width: scrollWidth, height: scrollHeight } = this.scrollDimensions
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;

    const x = scrollWidth  - viewportWidth;
    const y = scrollHeight - viewportHeight;

    return { x, y };
  }

  calculateTableDimensions() {
    const lastColumnState = this.columnStates[this.numOfCols - 1];
    const width = lastColumnState.position + lastColumnState.width;

    const { rowHeight } = this.theme;
    const height = this.numOfRows * rowHeight;

    return { width, height };
  }

  calculateScrollDimensions() {
    const { width: tableWidth, height: tableHeight } = this.tableDimensions;
    const { width: viewportWidth, height: viewportHeight } = this.viewportDimensions;

    const width  = Math.max(tableWidth, viewportWidth);
    const height = Math.max(tableHeight, viewportHeight);
    
    return { width, height };
  }

  calculateNormalizedScrollPosition(scrollPosition: VectorLike) {
    return new Vector(scrollPosition)
      .div(this.maximumScrollPosition)
      .data();
  }

  get numOfRows() {
    return this.dataRows.length;
  }

  get numOfCols() {
    return this.columnStates.length;
  }
}

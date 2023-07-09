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

  absoluteScrollPosition        = Vector.zero();
  normalizedScrollPosition      = Vector.zero();
  maximumAbsoluteScrollPosition = Vector.zero();

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

  setViewportDimensions(viewportDimensions: Vector) {
    this.viewportDimensions = viewportDimensions.copy();
    this.scrollDimensions = this.calculateScrollDimensions();
    this.maximumAbsoluteScrollPosition = this.calculateMaximumAbsoluteScrollPosition();
    this.absoluteScrollPosition = this.absoluteScrollPosition.min(this.maximumAbsoluteScrollPosition);
    this.tableRanges = this.calculateTableRanges();
  }

  getVisibleColumnStates() {
    const { columnLeft, columnRight } = this.tableRanges;

    const columnStates = [];
    for (let j = columnLeft; j < columnRight; j++) {
      columnStates.push(this.columnStates[j]);
    }

    return columnStates;
  }

  getVisibleDataRows() {
    const { rowTop, rowBottom } = this.tableRanges;

    const dataRows = [];
    for (let i = rowTop; i < rowBottom; i++) {
      dataRows.push(this.dataRows[i]);
    }

    return dataRows;
  }

  calculateTableRanges(): TableRanges {
    const numOfColumns = this.columnStates.length;
    const numOfRows    = this.dataRows.length;

    const { x: scrollLeft,    y: scrollTop      } = this.absoluteScrollPosition;
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

  calculateMaximumAbsoluteScrollPosition() {
    const { x: scrollWidth,   y: scrollHeight } = this.scrollDimensions
    const { x: viewportWidth, y: viewportHeight } = this.viewportDimensions;

    const maxAbsoluteScrollLeft = scrollWidth  - viewportWidth;
    const maxAbsoluteScrollTop  = scrollHeight - viewportHeight;

    return new Vector(maxAbsoluteScrollLeft, maxAbsoluteScrollTop);
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
    const { y: viewportWidth, y: viewportHeight } = this.viewportDimensions;

    const newScrollWidth  = Math.max(tableWidth, viewportWidth);
    const newScrollHeight = Math.max(tableHeight, viewportHeight);
    
    return new Vector(newScrollWidth, newScrollHeight);
  }
}

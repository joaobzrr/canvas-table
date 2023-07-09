import { ColumnState, DataRow } from "./types";

export class TableState {
  columnStates: ColumnState[];
  dataRows:     DataRow[];

  setTableData(columnStates: ColumnState[], dataRows: DataRow[]) {
    this.columnStates = columnStates;
    this.dataRows = dataRows;
  }
}

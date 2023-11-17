import { DataRowId } from "../../types";

export class TableState {
  columnWidths: number[];

  selectedRowId: DataRowId | null = null;
  selectedRowIndex = -1;
  selectedColIndex = -1;

  constructor(columnWidths: number[]) {
    this.columnWidths = columnWidths;
  }
}

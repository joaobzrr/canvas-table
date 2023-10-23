import React from "react";
import { ColumnDef, DataRow } from "canvas-table-core";

export type Table = {
  id: string;
  name: string;
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
}

export type TabItem = {
  label: string;
  key: React.Key;
}

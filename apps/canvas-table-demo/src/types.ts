import { type ColumnDef, type DataRow } from '@bzrr/canvas-table-react';

export type Table = {
  id: string;
  name: string;
  columnDefs: ColumnDef[];
  dataRows: DataRow[];
};

export type TabItem = {
  label: string;
  key: React.Key;
};

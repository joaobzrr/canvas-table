import { DEFAULT_COLUMN_WIDTH } from '../constants';
import type { CanvasTableProps, ColumnDef } from '../types';

export function computeColumnWidths(columnDefs: ColumnDef[]) {
  const columnWidths = [] as number[];
  for (const { width } of columnDefs) {
    columnWidths.push(width ?? DEFAULT_COLUMN_WIDTH);
  }
  return columnWidths;
}

export function compareProps(obj1: CanvasTableProps, obj2: CanvasTableProps) {
  type Key = keyof CanvasTableProps;
  const keys = Object.keys(obj1) as Key[];
  const entries = keys.map((key) => [key, !Object.is(obj1[key], obj2[key])]);
  const diff = Object.fromEntries(entries) as Record<Key, boolean>;
  return diff;
}

import { v4 as uuidv4 } from "uuid";
import { ColumnDef } from "../KonvaTable";
import { randint } from "./randint";
import { randstr } from "./randstr";

export function generateTableData<T extends Record<string, string>>(
  rows: number,
  cols: number
): [ColumnDef[], T[]] {
  const columns = [];
  for (let i = 0; i < cols; i++) {
    columns.push({
      title: `Column ${i + 1}`,
      field: `column${i + 1}`,
      width: randint(100, 200)
    });
  }

  const data = [];
  for (let i = 0; i < rows; i++) {
    const row = Object.fromEntries(columns.map(column => {
      return [column.field, randstr(16)];
    }));

    row.id = uuidv4();

    data.push(row);
  }

  return [columns, data as T[]];
}

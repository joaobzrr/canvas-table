import { v4 as uuidv4 } from "uuid";
import { ColumnDef } from "../../KonvaTable";
import { randint } from "./randint";
import { randstr } from "./randstr";

export function generateTableData<T extends Record<string, string>>(
  rows: number,
  cols: number
): [ColumnDef[], T[]] {
  const columns = [];
  for (let colIndex = 0; colIndex < cols; colIndex++) {
    columns.push({
      title: `Column ${colIndex + 1}`,
      field: `column${colIndex + 1}`,
      width: randint(100, 200)
    });
  }

  const data = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const row = Object.fromEntries(columns.map(column => {
      return [column.field, randstr(16)];
    }));

    row.id = uuidv4();

    data.push(row);
  }

  return [columns, data as T[]];
}

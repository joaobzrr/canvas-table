import { ColumnDef } from "canvas-table";
import { v4 as uuidv4 } from "uuid";
import { randint } from "./randint";
import { randstr } from "./randstr";

const charset = Array.from("abcdefghijklmnopqrstuvwxyz世界中で深刻な関心を引き起こしています");

export function generateTableData<T extends Record<string, string>>(
  rows: number,
  cols: number
): { columns: ColumnDef[], data:  T[] } {
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
      return [column.field, randstr(charset, 16)];
    }));

    row.id = uuidv4();

    data.push(row);
  }

  return {
    columns,
    data: data as T[]
  };
}

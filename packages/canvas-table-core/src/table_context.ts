import { make_table_state } from "./table_state";
import { Table_Props, Table_Context } from "./types";

export function make_table_context(canvas: HTMLCanvasElement, props: Table_Props) {
  const table_context = { canvas } as Table_Context;
  table_context.state = make_table_state(table_context, props);
  return table_context;
}

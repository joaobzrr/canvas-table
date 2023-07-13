import Konva from "konva";
import { TableState } from "./TableState";
import { Grid } from "./Grid";
import { HorizontalScrollbar } from "./HorizontalScrollbar";
import { Vector } from "./Vector";
import { KonvaTableOptions, ColumnDef } from "./types";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  grid: Grid;

  hsb: HorizontalScrollbar;

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer();

    this.tableState = new TableState();

    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    this.hsb = new HorizontalScrollbar(this.tableState);

    this.grid = new Grid({ tableState: this.tableState });
    this.layer.add(this.grid);
    this.layer.add(this.hsb);
    
    this.stage.add(this.layer);

    this.layer.getContext();
  }

  setCanvasDimensions(size: { width: number, height: number }) {
    this.stage.width(size.width);
    this.stage.height(size.height);

    this.tableState.setViewportDimensions(new Vector(size.width, size.height));

    this.grid.onResize(size);
    this.hsb.onResize(size);
  }

  columnDefsToColumnStates(columnDefs: ColumnDef[]) {
    const result = [];
    let total = 0;

    for (const columnDef of columnDefs) {
      result.push({ ...columnDef, position: total });
      total += columnDef.width;
    }

    return result;
  }
}

import Konva from "konva";
import { TableState } from "./TableState";
import { KonvaTableOptions, ColumnDef } from "./types";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });

    this.layer = new Konva.Layer();

    this.tableState = new TableState();

    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    /***************************/

    for (const columnState of this.tableState.columnStates) {
      const line = new Konva.Line({
	x: columnState.position,
	y: 0,
	points: [0, 0, 0, 400],
	stroke: "black"
      });

      this.layer.add(line);
    }
    
    this.stage.add(this.layer);

    this.layer.draw();
  }

  setCanvasDimensions(width: number, height: number) {
    this.stage.width(width);
    this.stage.height(height);
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

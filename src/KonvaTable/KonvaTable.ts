import Konva from "konva";
import { TableState } from "./TableState";
import { DynamicGroup } from "./DynamicGroup";
import { KonvaTableOptions, ColumnDef } from "./types";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  lineGroup = new DynamicGroup({
    make: () => new Konva.Line()
  });

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });

    this.layer = new Konva.Layer();

    this.tableState = new TableState();

    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    this.layer.add(this.lineGroup);
    
    this.stage.add(this.layer);
    this.layer.draw();

    new Konva.Line();
  }

  redraw() {
    this.lineGroup.clear();

    for (const columnState of this.tableState.columnStates) {
      const line = this.lineGroup.useOne();
      line.x(columnState.position);
      line.y(0);
      line.points([0, 0, 0, this.stage.height()])
      line.stroke("black")
    }
  }

  setCanvasDimensions(width: number, height: number) {
    this.stage.width(width);
    this.stage.height(height);

    this.redraw();
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

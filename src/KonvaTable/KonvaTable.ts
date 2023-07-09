import Konva from "konva";
import { TableState } from "./TableState";
import { DynamicGroup } from "./DynamicGroup";
import { Vector } from "./Vector";
import { KonvaTableOptions, ColumnDef } from "./types";

export class KonvaTable {
  stage: Konva.Stage;
  layer: Konva.Layer;

  tableState: TableState;

  grid = new DynamicGroup({
    class: Konva.Line,
    initialSize: 64
  });

  constructor(options: KonvaTableOptions) {
    this.stage = new Konva.Stage({ container: options.container });
    this.layer = new Konva.Layer();

    this.tableState = new TableState();

    const columnStates = this.columnDefsToColumnStates(options.columnDefs);
    this.tableState.setTableData(columnStates, options.dataRows);

    this.layer.add(this.grid);
    
    this.stage.add(this.layer);
    this.layer.draw();

    new Konva.Line();
  }

  redraw() {
    this.grid.reset();

    const theme = this.tableState.theme;
    const offset = this.tableState.absoluteScrollPosition.reverse();

    const { columnLeft, columnRight } = this.tableState.tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.columnStates[j];
      const relX = columnState.position;

      this.grid.useOne({
	x: relX + offset.x,
	y: 0,
	points: [0, 0, 0, this.stage.height()],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }

    const { rowTop, rowBottom } = this.tableState.tableRanges;
    for (let i = rowTop; i < rowBottom; i++) {
      const relY = i * theme.rowHeight;

      this.grid.useOne({
	x: 0,
	y: relY + offset.y,
	points: [0, 0, this.stage.width(), 0],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }
  }

  setCanvasDimensions(width: number, height: number) {
    this.stage.width(width);
    this.stage.height(height);

    debugger;
    this.tableState.setViewportDimensions(new Vector(width, height));

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

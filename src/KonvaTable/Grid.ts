import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { DynamicGroup } from "./DynamicGroup";
import { TableState } from "./TableState";

export interface GridConfig extends ComponentConfig {
  tableState: TableState;
}

export class Grid extends Component {
  tableState: TableState;

  group: DynamicGroup<typeof Konva.Line>;

  constructor(config: GridConfig) {
    super(config);

    this.tableState = config.tableState;

    this.group = new DynamicGroup({
      class: Konva.Line,
      initialSize: 64
    });

    this.add(this.group);

    this.on("resize", this.onResize.bind(this));
  }

  onResize() {
    this.group.reset();

    const { width, height } = this.size();

    const scrollPosition = this.tableState.scrollPosition;
    const theme = this.tableState.theme;

    const { columnLeft, columnRight } = this.tableState.tableRanges;
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = this.tableState.columnStates[j];
      const colRelPos = columnState.position;
      const colAbsPos = colRelPos - scrollPosition.x;

      this.group.useOne({
	x: colAbsPos,
	y: 0,
	points: [0, 0, 0, height],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }

    const { rowTop, rowBottom } = this.tableState.tableRanges;
    for (let i = rowTop; i < rowBottom; i++) {
      const rowRelPos = i * theme.rowHeight;
      const rowAbsPos = rowRelPos - scrollPosition.y;

      this.group.useOne({
	x: 0,
	y: rowAbsPos,
	points: [0, 0, width, 0],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }
  }
}

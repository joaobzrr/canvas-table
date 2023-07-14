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
    this.render();
  }

  onWheel() {
    this.render();
  }

  render() {
    const { x: scrollLeft, y: scrollTop   } = this.tableState.scrollPosition;
    const { x: tableWidth, y: tableHeight } = this.tableState.tableDimensions;
    const { x: viewportWidth, y: viewportHeight } = this.tableState.viewportDimensions;
    const { columnLeft, columnRight } = this.tableState.tableRanges;
    const theme = this.tableState.theme;

    const { width: gridWidth, height: gridHeight } = this.size();

    this.group.reset();

    for (let j = Math.max(columnLeft, 1); j < columnRight; j++) {
      const columnState = this.tableState.columnStates[j];
      const relColPos = columnState.position;
      const absColPos = relColPos - scrollLeft;

      this.group.useOne({
	x: absColPos,
	y: 0,
	points: [0, 0, 0, Math.min(gridHeight, tableHeight)],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }

    if (viewportWidth > tableWidth) {
      const relTableRight = tableWidth;
      const absTableRight = relTableRight - scrollLeft;

      this.group.useOne({
	x: absTableRight,
	y: 0,
	points: [0, 0, 0, Math.min(gridHeight, tableHeight)],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }

    const { rowTop, rowBottom } = this.tableState.tableRanges;
    for (let i = Math.max(rowTop, 1); i < rowBottom; i++) {
      const relRowPos = i * theme.rowHeight;
      const absRowPos = relRowPos - scrollTop;

      this.group.useOne({
	x: 0,
	y: absRowPos,
	points: [0, 0, Math.min(gridWidth, tableWidth), 0],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }

    if (viewportHeight > tableHeight) {
      const relRowPos = tableHeight;
      const absRowPos = relRowPos - scrollTop;

      this.group.useOne({
	x: 0,
	y: absRowPos,
	points: [0, 0, Math.min(gridWidth, tableWidth), 0],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }
  }
}

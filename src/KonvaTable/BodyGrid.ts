import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { DynamicGroup } from "./DynamicGroup";
import { TableState } from "./TableState";

export interface BodyGridConfig extends ComponentConfig {
  tableState: TableState;
}

export class BodyGrid extends Component {
  tableState: TableState;

  group: DynamicGroup<Konva.Line>;

  constructor(config: BodyGridConfig) {
    super(config);

    this.tableState = config.tableState;

    this.group = new DynamicGroup({
      make: () => new Konva.Line(),
      initialSize: 64
    });
    this.add(this.group);

    this.on("widthChange heightChange", this.onResize.bind(this));
  }

  onResize() {
    this.render();
  }

  onWheel() {
    this.render();
  }

  render() {
    const { x: scrollLeft, y: scrollTop   } = this.tableState.scrollPosition;
    const { width: tableWidth, height: tableHeight } = this.tableState.tableDimensions;
    const { width: viewportWidth, height: viewportHeight } = this.tableState.viewportDimensions;
    const { columnLeft, columnRight } = this.tableState.tableRanges;
    const { theme } = this.tableState;

    const { width: gridWidth, height: gridHeight } = this.size();

    this.group.reset();

    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = this.tableState.getColumnState(j);
      const relColPos = columnState.position;
      const absColPos = relColPos - scrollLeft;

      const cell = this.group.useOne();
      cell.setAttrs({
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

      const cell = this.group.useOne()
      cell.setAttrs({
	x: absTableRight,
	y: 0,
	points: [0, 0, 0, Math.min(gridHeight, tableHeight)],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }

    const { rowTop, rowBottom } = this.tableState.tableRanges;
    for (let i = rowTop + 1; i < rowBottom; i++) {
      const relRowPos = i * theme.rowHeight;
      const absRowPos = relRowPos - scrollTop;

      const cell = this.group.useOne();
      cell.setAttrs({
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

      const cell = this.group.useOne();
      cell.setAttrs({
	x: 0,
	y: absRowPos,
	points: [0, 0, Math.min(gridWidth, tableWidth), 0],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }
  }
}

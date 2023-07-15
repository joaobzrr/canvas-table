import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { DynamicGroup } from "./DynamicGroup";
import { TableState } from "./TableState";

export interface HeadGridConfig extends ComponentConfig {
  tableState: TableState;
}

export class HeadGrid extends Component {
  tableState: TableState;

  group: DynamicGroup<typeof Konva.Line>;

  constructor(config: HeadGridConfig) {
    super(config);

    this.tableState = config.tableState;

    this.group = new DynamicGroup({
      class: Konva.Line,
      initialSize: 64
    });
    this.add(this.group);
  }

  onResize() {
    this.render();
  }

  onWheel() {
    this.render();
  }

  render() {
    const { x: scrollLeft } = this.tableState.scrollPosition;
    const { columnLeft, columnRight } = this.tableState.tableRanges;
    const { theme } = this.tableState;

    this.group.reset();

    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = this.tableState.columnStates[j];
      const relColPos = columnState.position;
      const absColPos = relColPos - scrollLeft;

      this.group.useOne({
	x: absColPos,
	y: 0,
	points: [0, 0, 0, this.height()],
	stroke: theme.tableBorderColor,
	strokeWidth: 1
      });
    }
  }
}

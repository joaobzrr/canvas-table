import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { TableState } from "./TableState";
import { HeadGrid } from "./HeadGrid";

export interface HeadConfig extends ComponentConfig {
  tableState: TableState;
}

export class Head extends Component {
  tableState: TableState;

  grid: HeadGrid;

  bottomBorder: Konva.Line;

  constructor(config: HeadConfig) {
    super(config);

    this.tableState = config.tableState;

    this.grid = new HeadGrid({ tableState: this.tableState });
    this.add(this.grid);

    this.bottomBorder = new Konva.Line();
    this.add(this.bottomBorder);
  }

  onResize() {
    const { theme } = this.tableState;

    this.grid.width(this.width());
    this.grid.height(this.height());
    this.grid.onResize();

    this.bottomBorder.setAttrs({
      x: 0,
      y: this.y() + this.height(),
      points: [0, 0, this.width(), 0],
      stroke: theme.tableBorderColor,
      strokeWidth: 1
    });
  }

  onWheel() {
    this.grid.onWheel();
  }
}

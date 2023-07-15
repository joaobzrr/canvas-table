import Konva from "konva";
import { Component, ComponentConfig } from "./Component";
import { TableState } from "./TableState";

export interface BodyCellConfig extends ComponentConfig {
  tableState: TableState;
}

export class BodyCell extends Component {
  tableState: TableState;

  text: Konva.Text;

  constructor(config: BodyCellConfig) {
    super(config);

    this.tableState = config.tableState;

    const { theme } = this.tableState;

    this.text = new Konva.Text({
      x: theme.cellPadding,
      text: config.text,
      fontSize: theme.fontSize,
      fontFamily: theme.fontFamily,
      fill: theme.fontColor,
      verticalAlign: "middle",
      wrap: "none",
      ellipsis: true
    });

    this.add(this.text);
    this.on("widthChange heightChange", this.onResize.bind(this))
  }

  onResize() {
    const { theme } = this.tableState;

    this.text.width(this.width() - theme.cellPadding * 2);
    this.text.height(this.height());
  }

  setText(text: string) {
    this.text.text(text);
  }
}

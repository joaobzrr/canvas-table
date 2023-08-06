import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { Theme } from "../types";
import { Text } from "./Text";

export interface HeadCellConfig extends GroupConfig {
  theme: Theme;
}

export class HeadCell extends Konva.Group {
  theme: Theme;
  text:  Text;

  constructor(config: HeadCellConfig) {
    super(config);

    this.theme = config.theme;

    this.text = new Text({
      width: this.width(),
      height: this.height(),
      padding: this.theme.cellPadding,
      text: config.text,
      fontConfig: "bold",
      listening: false
    });
    this.add(this.text);

    this.on("widthChange heightChange", () => this.text.size(this.size()));
  }

  setText(text: string) {
    this.text.setText(text);
  }
}

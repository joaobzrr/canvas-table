import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { Text } from "./Text";
import { Theme } from "./types";

export interface HeadCellConfig extends GroupConfig {
  theme: Theme;
  text: string;
}

export class HeadCell extends Konva.Group {
  theme: Theme;

  constructor(config: HeadCellConfig) {
    super(config);

    this.theme = config.theme;

    this.add(new Text({
      width: this.width(),
      height: this.height(),
      padding: this.theme.cellPadding,
      text: config.text,
      fontConfig: "bold"
    }));
  }
}

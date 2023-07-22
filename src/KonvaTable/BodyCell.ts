import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { Text } from "./Text";
import { Theme } from "./types";

export interface BodyCellConfig extends GroupConfig {
  text: string;
}

export class BodyCell extends Konva.Group {
  theme: Theme;

  constructor(config: BodyCellConfig) {
    super(config);

    this.theme = config.theme;

    this.add(new Text({
      width: this.width(),
      height: this.height(),
      padding: this.theme.cellPadding,
      text: config.text
    }));
  }
}

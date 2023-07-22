import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { Text } from "./Text";
import { Theme } from "./types";

export interface BodyCellConfig extends GroupConfig {
  text: string;
  theme: Theme;
}

export class BodyCell extends Konva.Group {
  text: string;
  theme: Theme;

  constructor(config: BodyCellConfig) {
    super(config);

    this.text = config.text;
    this.theme = config.theme;

    this.add(new Text({
      width: this.width(),
      height: this.height(),
      text: config.text,
      padding: this.theme.cellPadding
    }));
  }
}

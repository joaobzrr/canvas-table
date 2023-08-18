import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";
import { TextRenderer } from "text-renderer";
import { Theme } from "../types";
import { Text } from "./Text";

export interface HeadCellConfig extends GroupConfig {
  textRenderer: TextRenderer;
  theme: Theme;
}

export class HeadCell extends Konva.Group {
  private text: Text;
  private theme: Theme;

  constructor(config: HeadCellConfig) {
    super(config);

    this.theme = config.theme;

    const font = {
      family: this.theme.fontFamily,
      size:   this.theme.fontSize,
      color:  this.theme.fontColor,
      style:  "bold" as const
    };

    this.text = new Text({
      renderer: config.textRenderer,
      padding: this.theme.cellPadding,
      font,
      listening: false
    });
    this.add(this.text);

    this.on("widthChange heightChange", () => this.text.size(this.size()));
    this.on("textChange", event => {
      this.text.setAttr("textValue", (event as any).newVal);
    });
  }
}

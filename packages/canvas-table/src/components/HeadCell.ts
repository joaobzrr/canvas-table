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

  constructor(config: HeadCellConfig) {
    super(config);

    const font = {
      family: config.theme.fontFamily,
      size:   config.theme.fontSize,
      color:  config.theme.fontColor,
      style:  "bold" as const
    };

    this.text = new Text({
      renderer: config.textRenderer,
      padding: config.theme.cellPadding,
      font,
      listening: false
    });
    this.add(this.text);

    this.on("widthChange heightChange", () => this.text.size(this.size()));

    this.on("textChange", event => {
      this.text.setAttr("textValue", (event as any).newVal);
    });

    this.on("themeChange", event => {
      const theme = (event as any).newVal as Theme;
      const font = {
        family: theme.fontFamily,
        size:   theme.fontSize,
        color:  theme.fontColor,
        style:  "bold" as const
      };
      this.text.setAttr("font", font);
    });
  }
}

import Konva from "konva";
import { TextRenderer } from "text-renderer";
import { Text } from "../components";
import { Theme } from "../types";

export class BodyCellFactory {
  constructor(
    private textRenderer: TextRenderer,
    private theme: Theme
  ) { }

  public make() {
    const group = new Konva.Group({ listening: false });

    const text = new Text({
      renderer: this.textRenderer,
      theme: this.theme
    });
    group.add(text);

    group.on("widthChange heightChange", () => text.size(group.size()));
    group.on("textChange", event => {
      text.setAttr("textValue", (event as any).newVal);
    });

    return group;
  }

  public reset(group: Konva.Group) {
    return group.setAttrs({
      x: 0,
      y: 0
    });
  }
}

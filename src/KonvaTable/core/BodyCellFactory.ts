import Konva from "konva";
import { Theme } from "../types";
import { Text } from "../components/Text";

export class BodyCellFactory {
  constructor(private theme: Theme) {}

  make() {
    debugger;

    const group = new Konva.Group();
    const text = new Text({
      padding: this.theme.cellPadding,
      fontConfig: "normal",
      listening: false
    });

    group.add(text);
    group.on("widthChange heightChange", () => text.size(group.size()));
    group.on("textChange", event => {
      text.setAttr("textValue", (event as any).newVal);
    });
    return group;
  }

  reset(group: Konva.Group) {
    return group.setAttrs({
      x: 0,
      y: 0
    });
  }
}

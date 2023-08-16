import Konva from "konva";
import { Context } from "konva/lib/Context";
import { TextRenderer } from "../core/TextRenderer";
import { Theme } from "../types";

export class HeadCellFactory {
  constructor(
    private textRenderer: TextRenderer,
    private theme: Theme
  ) { }

  make() {
    const group = new Konva.Group();

    const textShape = new Konva.Shape();
    textShape.sceneFunc((ctx: Context) => {
      const text = textShape.getAttr("textValue") as string;
      if (!text) {
        return;
      }

      const font = {
        family: this.theme.fontFamily,
        size: this.theme.fontSize,
        style: "bold" as const,
        color: this.theme.fontColor
      };

      const x = this.theme.cellPadding;
      const y = textShape.height() / 2;
      const maxWidth = textShape.width() - this.theme.cellPadding * 2;

      this.textRenderer.render(
        ctx as unknown as CanvasRenderingContext2D,
        font, text, x, y, maxWidth, true);
    });

    group.add(textShape);
    group.on("widthChange heightChange", () => textShape.size(group.size()));
    group.on("textChange", event => {
      textShape.setAttr("textValue", (event as any).newVal);
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

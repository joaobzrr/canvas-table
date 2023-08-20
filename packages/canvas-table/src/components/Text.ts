import Konva from "konva";
import { Context } from "konva/lib/Context";
import { ShapeConfig } from "konva/lib/Shape";
import { TextRenderer, Font } from "text-renderer";

export interface TextConfig extends ShapeConfig {
  renderer: TextRenderer;
  font: Font;
  padding: number;
}

export class Text extends Konva.Shape {
  private renderer: TextRenderer;
  private padding: number;

  constructor(config: TextConfig) {
    super(config);

    this.renderer = config.renderer;
    this.padding = config.padding;

    this.sceneFunc(this.render);
  }

  render(ctx: Context) {
    const text = this.getAttr("textValue") as string;
    if (!text) {
      return;
    }

    const font = this.getAttr("font") as Font;

    const x = this.padding;
    const y = this.height() / 2;
    const maxWidth = this.width() - this.padding * 2;

    this.renderer.render(
      ctx as unknown as CanvasRenderingContext2D,
      font, text, x, y, maxWidth, true);
  }
}

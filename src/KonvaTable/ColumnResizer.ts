import Konva from "konva";
import { GroupConfig } from "konva/lib/Group";

export interface ColumnResizerConfig extends GroupConfig {
}

export class ColumnResizer extends Konva.Group {
  rect: Konva.Rect;

  constructor(config?: ColumnResizerConfig) {
    super(config);

    this.rect = new Konva.Rect({
      width: this.width(),
      height: this.height(),
      fill: "red"
    });
    this.add(this.rect);

    this.on("widthChange heightChange", () => {
      this.rect.size(this.size());
    });
  }
}

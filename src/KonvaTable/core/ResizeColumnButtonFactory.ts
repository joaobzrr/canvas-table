import Konva from "konva";
import { RESIZE_COLUMN_BUTTON_SIDE } from "../constants";
import { Theme } from "../types";

export class ResizeColumnButtonFactory {
  constructor(private theme: Theme) {}

  make() {
    const button = new Konva.Rect({
      width: RESIZE_COLUMN_BUTTON_SIDE,
      height: this.theme.rowHeight
    });

    button.on("mouseenter", () => {
      button.getStage()!.container().style.cursor = "col-resize";
    });

    button.on("mouseleave", () => {
      button.getStage()!.container().style.cursor = "default";
    });

    return button;
  }

  reset(rect: Konva.Rect) {
    return rect.setAttrs({
      x: 0,
      y: 0
    });
  }
}

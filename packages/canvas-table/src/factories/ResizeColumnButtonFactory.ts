import Konva from "konva";
import { RESIZE_COLUMN_BUTTON_SIDE } from "../constants";
import { Theme } from "../types";

export class ResizeColumnButtonFactory {
  constructor(private theme: Theme) {}

  make() {
    const button = new Konva.Rect({
      width: (RESIZE_COLUMN_BUTTON_SIDE * 2) + 1,
      height: this.theme.rowHeight
    });

    button.on("mouseenter", () => {
      button.getStage()!.container().style.cursor = "col-resize";
    });

    button.on("mouseleave", () => {
      button.getStage()!.container().style.cursor = "default";
    });

    button.on("onMouseDownChange", event => {
      const mouseDownHandler = (event as any).newVal;
      button.setAttr("mouseDownHandler", mouseDownHandler);
      button.on("mousedown", mouseDownHandler);
    });

    button.on("centerxChange", event => {
      const centerx = (event as any).newVal;
      const newX = centerx - button.width() / 2;
      button.x(newX);
    });

    return button;
  }

  reset(button: Konva.Rect) {
    const mouseDownHandler = button.getAttr("mouseDownHandler");
    if (mouseDownHandler) {
      button.off("mousedown", mouseDownHandler);
    }
    
    return button.setAttrs({
      x: 0,
      y: 0,

      // @Note We previously forgot to set this back to zero. This
      // caused the 'centerxChange' event handler to not fire in
      // some circumstances which, in turn, would cause the button
      // to get stuck at the top left corner of the screen.
      centerx: 0,

      mouseDownHandler: undefined
    });
  }
}

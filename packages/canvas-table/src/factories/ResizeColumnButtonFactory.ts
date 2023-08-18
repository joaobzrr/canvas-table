import Konva from "konva";
import { ResizeColumnButton } from "../components";
import { RESIZE_COLUMN_BUTTON_SIDE } from "../constants";
import { Theme } from "../types";

export class ResizeColumnButtonFactory {
  constructor(private theme: Theme) {}

  make() {
    return new ResizeColumnButton({
      width: (RESIZE_COLUMN_BUTTON_SIDE * 2) + 1,
      height: this.theme.rowHeight
    });
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

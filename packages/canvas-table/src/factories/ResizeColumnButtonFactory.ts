import Konva from "konva";
import { ResizeColumnButton } from "../components";
import { Theme } from "../types";

export type ResizeColumnButtonFactoryParams = {
  theme: Theme;
  onMouseDown: (columnIndex: number) => void;
}

export class ResizeColumnButtonFactory {
  private theme: Theme;
  private onMouseDown: (columnIndex: number) => void;

  constructor(params: ResizeColumnButtonFactoryParams) {
    this.theme = params.theme;
    this.onMouseDown = params.onMouseDown;
  }

  make() {
    return new ResizeColumnButton({
      height: this.theme.rowHeight,
      onMouseDown: this.onMouseDown
    });
  }

  reset(button: Konva.Rect) {
    return button.setAttrs({
      x: 0,
      y: 0,
      state: undefined,

      // @Note We previously forgot to set this back to zero. This
      // caused the 'centerxChange' event handler to not fire in
      // some circumstances which, in turn, would cause the button
      // to get stuck at the top left corner of the screen.
      centerx: undefined,
      columnIndex: undefined,
    });
  }
}

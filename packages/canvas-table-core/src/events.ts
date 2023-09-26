import { Theme, Size, VectorLike } from "./types";

export type ReflowEventDetail = {
  size: Size;
}

export class ReflowEvent extends CustomEvent<ReflowEventDetail> {
  constructor(size: Size) {
    super("reflow", { detail: { size } });
  }
}


export type ThemeChangedEventDetail = {
  theme: Theme;
}

export class ThemeChangedEvent extends CustomEvent<ThemeChangedEventDetail> {
  constructor(theme: Theme) {
    super("themeChanged", { detail: { theme } });
  }
}


export type ScrollEventDetail = {
  pos: VectorLike;
  normalizedPos: VectorLike;
}

export class ScrollEvent extends CustomEvent<ScrollEventDetail> {
  constructor(pos: VectorLike, normalizedPos: VectorLike) {
    super("scroll", { detail: { pos, normalizedPos } });
  }
}


export type MouseDownEventDetail = {
  mousePos: VectorLike;
  button: number;
}

export class MouseDownEvent extends CustomEvent<MouseDownEventDetail> {
  constructor(detail: MouseDownEventDetail) {
    super("mousedown", { detail });
  }
}


export type MouseUpEventDetail = Record<string, never>;

export class MouseUpEvent extends CustomEvent<MouseUpEventDetail> {
  constructor() {
    super("mouseup");
  }
}


export type MouseMoveEventDetail = {
  mousePos: VectorLike;
}

export class MouseMoveEvent extends CustomEvent<MouseMoveEventDetail> {
  constructor(mousePos: VectorLike) {
    super("mousemove", {
      detail: {
        mousePos
      }
    });
  }
}

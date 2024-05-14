import { getContext, isPointInRect } from "./utils";
import { MOUSE_BUTTONS } from "./constants";

export type Mouse_Buttons = typeof MOUSE_BUTTONS;
export type Mouse_Button_Value = Mouse_Buttons[keyof Mouse_Buttons];

export class Platform {
  containerEl: HTMLDivElement;
  wrapperEl: HTMLDivElement;

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  fontMetricsCanvas: HTMLCanvasElement;
  fontMetricsCanvasCtx: CanvasRenderingContext2D;

  updateFunction?: () => void;

  currMouseX = 0;
  currMouseY = 0;

  prevMouseX = 0;
  prevMouseY = 0;

  currMouseButtons = 0;
  prevMouseButtons = 0;

  mouseHasMoved = false;

  dragStartX = 0;
  dragStartY = 0;

  dragDistanceX = 0;
  dragDistanceY = 0 ;

  scrollAmountX = 0;
  scrollAmountY = 0;

  rafId?: number;

  mouseDownHandler: (event: MouseEvent) => void;
  mouseUpHandler: (event: MouseEvent) => void;
  mouseMoveHandler: (event: MouseEvent) => void;
  wheelHandler: (event: WheelEvent) => void;
  visibilityChangeHandler: () => void;

  constructor(containerId: string) {
    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      throw new Error(`Element with id "${containerId}" could not be found`);
    }
    this.containerEl = containerEl as HTMLDivElement;
    this.containerEl.replaceChildren();
    this.containerEl.style.overflow = "hidden";

    this.wrapperEl = document.createElement("div");
    this.wrapperEl.style.height = "100%";
    this.wrapperEl.classList.add("canvas-table-wrapper");
    this.containerEl.appendChild(this.wrapperEl);

    this.canvas = document.createElement("canvas");
    this.wrapperEl.appendChild(this.canvas);

    this.ctx = getContext(this.canvas);
    this.restoreCanvasContextProperties();

    this.fontMetricsCanvas = document.createElement("canvas");
    this.fontMetricsCanvasCtx = getContext(this.fontMetricsCanvas);

    this.mouseDownHandler        = this.onMouseDown.bind(this);
    this.mouseUpHandler          = this.onMouseUp.bind(this);
    this.mouseMoveHandler        = this.onMouseMove.bind(this);
    this.wheelHandler            = this.onWheel.bind(this);
    this.visibilityChangeHandler = this.onVisibilityChange.bind(this);

    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("wheel", this.wheelHandler);
    document.addEventListener("mousemove", this.mouseMoveHandler);
    document.addEventListener("mouseup", this.mouseUpHandler);
    document.addEventListener("visibilitychange", this.visibilityChangeHandler);
  }

  destroy() {
    this.stopAnimation();

    document.removeEventListener("mousemove", this.mouseMoveHandler);
    document.removeEventListener("mouseup", this.mouseUpHandler);
    document.removeEventListener("visibilitychange", this.visibilityChangeHandler);
  }

  startAnimation() {
    if (this.rafId === undefined) {
      this.rafId = requestAnimationFrame(() => this.animate());
    }
  }

  stopAnimation() {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
  }

  getFontMetrics(font: string) {
    this.fontMetricsCanvasCtx.font = font;
    const {
      fontBoundingBoxAscent,
      fontBoundingBoxDescent
    } = this.fontMetricsCanvasCtx.measureText("M");

    return {
      fontBoundingBoxAscent,
      fontBoundingBoxDescent
    };
  }

  isMouseInRect(rx: number, ry: number, rw: number, rh: number) {
    return isPointInRect(this.currMouseX, this.currMouseY, rx, ry, rw, rh);
  }

  isMouseDown(button: Mouse_Button_Value) {
    const value = this.normalizedToButtonsValue(button);
    return this.currMouseButtons & value;
  }

  isMousePressed(button: Mouse_Button_Value) {
    const value = this.normalizedToButtonsValue(button);
    return (this.currMouseButtons & value) === 1 && (this.prevMouseButtons & value) === 0;
  }

  isMouseReleased(button: Mouse_Button_Value) {
    const value = this.normalizedToButtonsValue(button);
    return (this.currMouseButtons & value) === 0 && (this.prevMouseButtons & value) === 1;
  }

  animate() {
    if (this.containerEl.offsetWidth !== this.canvas.width || this.containerEl.offsetHeight !== this.canvas.height) {
      this.resizeCanvas(this.containerEl.offsetWidth, this.containerEl.offsetHeight);
    }

    this.mouseHasMoved = this.currMouseX !== this.prevMouseX || this.currMouseY !== this.prevMouseY;

    if (this.isMousePressed(MOUSE_BUTTONS.PRIMARY)) {
      this.dragStartX = this.currMouseX;
      this.dragStartY = this.currMouseY;
    }

    if (this.isMouseDown(MOUSE_BUTTONS.PRIMARY)) {
      this.dragDistanceX = this.currMouseX - this.dragStartX;
      this.dragDistanceY = this.currMouseY - this.dragStartY;
    }

    this.updateFunction?.();

    this.prevMouseX = this.currMouseX;
    this.prevMouseY = this.currMouseY;
    this.prevMouseButtons = this.currMouseButtons;

    this.scrollAmountX = 0;
    this.scrollAmountY = 0;

    this.rafId = requestAnimationFrame(() => this.animate());
  }

  resizeCanvas(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.restoreCanvasContextProperties();
  }

  restoreCanvasContextProperties() {
    this.ctx.imageSmoothingEnabled = false;
  }

  normalizedToButtonsValue(value: Mouse_Button_Value): number {
    switch (value) {
      case MOUSE_BUTTONS.PRIMARY:
        return 1;
      case MOUSE_BUTTONS.SECONDARY:
        return 2;
      case MOUSE_BUTTONS.AUXILIARY:
        return 4;
      case MOUSE_BUTTONS.FOURTH:
        return 8;
      case MOUSE_BUTTONS.FIFTH:
        return 16;
    }
  }

  updateMouseState(event: MouseEvent) {
    const bcr = this.wrapperEl.getBoundingClientRect();
    this.prevMouseX = this.currMouseX;
    this.prevMouseY = this.currMouseY;
    this.currMouseX = event.clientX - bcr.x;
    this.currMouseY = event.clientY - bcr.y;
    this.currMouseButtons = event.buttons;
  }

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.updateMouseState(event);
  }

  onMouseUp(event: MouseEvent) {
    this.updateMouseState(event);
  }

  onMouseMove(event: MouseEvent) {
    this.updateMouseState(event);
  }

  onWheel(event: WheelEvent) {
    this.scrollAmountX = event.deltaX;
    this.scrollAmountY = event.deltaY;
  }

  onVisibilityChange() {
    if (document.hidden) {
      this.stopAnimation();
    } else {
      this.startAnimation();
    }
  }
}

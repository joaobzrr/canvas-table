import { compareSize, isPointInRect } from "../../utils";

const MOUSE_BUTTONS = {
  PRIMARY: 0,
  SECONDARY: 1,
  AUXILIARY: 2,
  FOURTH: 3,
  FIFTH: 4
} as const;

export type MouseButtons = typeof MOUSE_BUTTONS;

export type MouseButtonValue = MouseButtons[keyof MouseButtons];

export class Stage {
  static MOUSE_BUTTONS = MOUSE_BUTTONS;

  containerEl: HTMLDivElement;
  relativeEl: HTMLDivElement;
  wrapperEl: HTMLDivElement;
  canvas: HTMLCanvasElement;

  resizeObserver: ResizeObserver;

  currMouseX = 0;
  currMouseY = 0;
  currMouseButtons = 0;

  prevMouseX = 0;
  prevMouseY = 0;
  prevMouseButtons = 0;

  doubleClickButton: number;

  dragAnchorX = 0;
  dragAnchorY = 0;
  dragStartX = 0;
  dragStartY = 0;
  dragDistanceX = 0;
  dragDistanceY = 0;

  scrollAmountX: number;
  scrollAmountY: number;

  updateCallback?: () => void;
  rafId?: number;

  lastPolledContainerSize = { width: 0, height: 0 };

  canvasWasResized = false;

  constructor(containerId: string) {
    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      throw new Error(`Element with id "${containerId}" could not be found`);
    }
    this.containerEl = containerEl as HTMLDivElement;

    this.containerEl.replaceChildren();
    this.containerEl.style.overflow = "hidden";

    this.relativeEl = document.createElement("div");
    this.relativeEl.style.position = "relative";
    this.relativeEl.style.height = "100%";
    this.containerEl.appendChild(this.relativeEl);

    this.wrapperEl = document.createElement("div");
    this.wrapperEl.classList.add("canvas-table-wrapper");
    this.relativeEl.appendChild(this.wrapperEl);

    this.canvas = document.createElement("canvas");
    this.wrapperEl.appendChild(this.canvas);

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      this.lastPolledContainerSize.width = entry.contentRect.width;
      this.lastPolledContainerSize.height = entry.contentRect.height;
    });
    this.resizeObserver.observe(this.containerEl);

    this.doubleClickButton = -1;

    this.scrollAmountX = 0;
    this.scrollAmountY = 0;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);

    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("dblclick", this.onDoubleClick);
    this.canvas.addEventListener("wheel", this.onWheel);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);

    this.loop = this.loop.bind(this);
  }

  run() {
    this.rafId = requestAnimationFrame(this.loop);
  }

  getContext() {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not instantiate canvas context");
    }
    return ctx;
  }

  setUpdateCallback(updateCallback: () => void) {
    this.updateCallback = updateCallback;
  }

  getCurrentCanvasSize() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  cleanup() {
    if (this.rafId) cancelAnimationFrame(this.rafId!);

    this.resizeObserver.unobserve(this.containerEl);

    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  isResize() {
    return this.canvasWasResized;
  }

  isMouseDown(button: MouseButtonValue) {
    const value = this.normalizedToButtonsValue(button);
    return this.currMouseButtons & value;
  }

  isMouseUp(button: MouseButtonValue) {
    const value = this.normalizedToButtonsValue(button);
    return !(this.currMouseButtons & value);
  }

  isMousePressed(button: MouseButtonValue) {
    const value = this.normalizedToButtonsValue(button);
    return (this.currMouseButtons & value) === 1 && (this.prevMouseButtons & value) === 0;
  }

  isMouseReleased(button: MouseButtonValue) {
    const value = this.normalizedToButtonsValue(button);
    return (this.currMouseButtons & value) === 0 && (this.prevMouseButtons & value) === 1;
  }

  isMouseDoubleClicked(button: MouseButtonValue) {
    const value = this.normalizedToButtonValue(button);
    return this.doubleClickButton !== -1 && this.doubleClickButton === value;
  }

  isMouseInRect(x: number, y: number, width: number, height: number) {
    return isPointInRect(this.currMouseX, this.currMouseY, x, y, width, height);
  }

  loop() {
    const currentCanvasSize = this.getCurrentCanvasSize();
    this.canvasWasResized = !compareSize(currentCanvasSize, this.lastPolledContainerSize);
    if (this.canvasWasResized) {
      this.canvas.width = this.lastPolledContainerSize.width;
      this.canvas.height = this.lastPolledContainerSize.height;
    }

    if (this.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.dragStartX = this.currMouseX;
      this.dragStartY = this.currMouseY;
    }

    if (this.isMouseDown(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.dragDistanceX = this.currMouseX - this.dragStartX;
      this.dragDistanceY = this.currMouseY - this.dragStartY;
    }

    this.updateCallback?.();

    this.prevMouseX = this.currMouseX;
    this.prevMouseY = this.currMouseY;
    this.prevMouseButtons = this.currMouseButtons;

    this.doubleClickButton = -1;

    this.scrollAmountX = 0;
    this.scrollAmountY = 0;

    this.rafId = requestAnimationFrame(this.loop);
  }

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.updateMouseState(event);
  }

  onMouseUp(event: MouseEvent) {
    this.updateMouseState(event);
  }

  onDoubleClick(event: MouseEvent) {
    this.doubleClickButton = event.button;
  }

  onMouseMove(event: MouseEvent) {
    this.updateMouseState(event);
  }

  onWheel(event: WheelEvent) {
    this.scrollAmountX = event.deltaX;
    this.scrollAmountY = event.deltaY;
  }

  updateMouseState(event: MouseEvent) {
    const bcr = this.wrapperEl.getBoundingClientRect();
    this.currMouseX = event.clientX - bcr.x;
    this.currMouseY = event.clientY - bcr.y;
    this.currMouseButtons = event.buttons;
  }

  normalizedToButtonValue(value: MouseButtonValue) {
    switch (value) {
      case Stage.MOUSE_BUTTONS.PRIMARY:
        return 0;
      case Stage.MOUSE_BUTTONS.AUXILIARY:
        return 1;
      case Stage.MOUSE_BUTTONS.SECONDARY:
        return 2;
      case Stage.MOUSE_BUTTONS.FOURTH:
        return 3;
      case Stage.MOUSE_BUTTONS.FIFTH:
        return 4;
    }
  }

  normalizedToButtonsValue(value: MouseButtonValue): number {
    switch (value) {
      case Stage.MOUSE_BUTTONS.PRIMARY:
        return 1;
      case Stage.MOUSE_BUTTONS.SECONDARY:
        return 2;
      case Stage.MOUSE_BUTTONS.AUXILIARY:
        return 4;
      case Stage.MOUSE_BUTTONS.FOURTH:
        return 8;
      case Stage.MOUSE_BUTTONS.FIFTH:
        return 16;
    }
  }
}

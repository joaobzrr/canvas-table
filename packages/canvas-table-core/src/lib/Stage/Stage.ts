import { isPointInRect } from "../../utils";
import { Size } from "../../types";

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

  updateFunction?: () => void;
  rafId?: number;

  constructor(containerId: string, size?: Size) {
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

    this.doubleClickButton = -1;

    this.scrollAmountX = 0;
    this.scrollAmountY = 0;

    if (size) {
      this.setSize(size);
    }

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

  setUpdateFunction(updateFunction: () => void) {
    this.updateFunction = updateFunction;
  }

  setSize(size: Size) {
    this.canvas.width = size && Math.max(size.width, 1);
    this.canvas.height = size && Math.max(size.height, 1);
  }

  getSize() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  cleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId!);
    }

    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
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
    if (this.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.dragStartX = this.currMouseX;
      this.dragStartY = this.currMouseY;
    }

    if (this.isMouseDown(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.dragDistanceX = this.currMouseX - this.dragStartX;
      this.dragDistanceY = this.currMouseY - this.dragStartY;
    }

    if (this.updateFunction) {
      this.updateFunction();
    }

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

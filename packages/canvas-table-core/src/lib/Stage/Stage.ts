import { createVector, isPointInRect } from "../../utils";
import { Rect, Vector, Size } from "../../types";

export class Stage {
  static MOUSE_BUTTONS = {
    PRIMARY: 1,
    SECONDARY: 2,
    AUXILIARY: 4,
    FOURTH: 8,
    FIFTH: 16
  };

  canvas: HTMLCanvasElement;
  containerEl: HTMLDivElement;
  wrapperEl: HTMLDivElement;

  currentMousePosition: Vector;
  currentMouseButtons: number;

  previousMousePosition: Vector;
  previousMouseButtons: number;

  dragAnchorPosition: Vector;
  mouseDragStartPosition: Vector;
  dragDistance: Vector;

  scrollAmount: Vector;

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

    this.wrapperEl = document.createElement("div");
    this.wrapperEl.classList.add("canvas-table-wrapper");
    this.containerEl.appendChild(this.wrapperEl);

    this.canvas = document.createElement("canvas");
    this.wrapperEl.appendChild(this.canvas);

    this.currentMousePosition = createVector();
    this.currentMouseButtons = 0;
    this.previousMousePosition = createVector();
    this.previousMouseButtons = 0;

    this.dragAnchorPosition = createVector();
    this.mouseDragStartPosition = createVector();
    this.dragDistance = createVector();

    this.scrollAmount = createVector();

    if (size) {
      this.setSize(size);
    }

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);

    this.canvas.addEventListener("mousedown", this.onMouseDown);
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

  isMouseDown(button: number) {
    return this.currentMouseButtons & button;
  }

  isMouseUp(button: number) {
    return !(this.currentMouseButtons & button);
  }

  isMousePressed(button: number) {
    return (this.currentMouseButtons & button) === 1 && (this.previousMouseButtons & button) === 0;
  }

  isMouseReleased(button: number) {
    return (this.currentMouseButtons & button) === 0 && (this.previousMouseButtons & button) === 1;
  }

  isMouseInRect(rect: Rect) {
    return isPointInRect(this.currentMousePosition, rect);
  }

  loop() {
    if (this.isMousePressed(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.mouseDragStartPosition.x = this.currentMousePosition.x;
      this.mouseDragStartPosition.y = this.currentMousePosition.y;
    }

    if (this.isMouseDown(Stage.MOUSE_BUTTONS.PRIMARY)) {
      this.dragDistance.x = this.currentMousePosition.x - this.mouseDragStartPosition.x;
      this.dragDistance.y = this.currentMousePosition.y - this.mouseDragStartPosition.y;
    }

    if (this.updateFunction) {
      this.updateFunction();
    }

    this.previousMousePosition.x = this.currentMousePosition.x;
    this.previousMousePosition.y = this.currentMousePosition.y;
    this.previousMouseButtons = this.currentMouseButtons;

    this.scrollAmount.x = 0;
    this.scrollAmount.y = 0;

    this.rafId = requestAnimationFrame(this.loop);
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
    this.scrollAmount.x = event.deltaX;
    this.scrollAmount.y = event.deltaY;
  }

  updateMouseState(event: MouseEvent) {
    const bcr = this.wrapperEl.getBoundingClientRect();

    const currentMousePosition = {
      x: event.clientX - bcr.x,
      y: event.clientY - bcr.y
    };
    this.currentMousePosition = currentMousePosition;
    this.currentMouseButtons = event.buttons;
  }
}

import { TextRenderer } from "text-renderer";
import { LineRenderer } from "./LineRenderer";
import {
  shallowMatch,
  createVector,
  isPointInRect,
  isObject
} from "./utils";
import {
  CreateUiContextParams,
  Shape,
  UiId,
  Rect,
  Vector,
  Size
} from "./types";

export class UiContext {
  static MOUSE_BUTTONS = {
    PRIMARY:   1,
    SECONDARY: 2,
    AUXILIARY: 4,
    FOURTH:    8,
    FIFTH:     16
  };

  canvas:      HTMLCanvasElement;
  containerEl: HTMLDivElement;
  wrapperEl:   HTMLDivElement;

  hot:    UiId | null;
  active: UiId | null;

  dragAnchorPosition:     Vector;
  mouseDragStartPosition: Vector;
  dragDistance:           Vector;

  currentMousePosition: Vector;
  currentMouseButtons: number;

  previousMousePosition: Vector;
  previousMouseButtons: number;

  renderQueue: Shape[];

  lineRenderer: LineRenderer;
  textRenderer: TextRenderer;

  constructor(params: CreateUiContextParams) {
    const { container, size } = params;

    const containerEl = document.getElementById(container);
    if (!containerEl) {
      throw new Error(`Element with id "${params.container}" could not be found`);
    }
    this.containerEl = containerEl as HTMLDivElement;

    this.containerEl.replaceChildren();
    this.containerEl.style.overflow = "hidden";

    this.wrapperEl = document.createElement("div");
    this.wrapperEl.classList.add("canvas-table-wrapper");
    this.containerEl.appendChild(this.wrapperEl);

    this.canvas = document.createElement("canvas");
    this.canvas.width  = size && size.width  > 0 ? size.width  : 1;
    this.canvas.height = size && size.height > 0 ? size.height : 1;
    this.wrapperEl.appendChild(this.canvas);

    this.hot    = null;
    this.active = null;

    this.currentMousePosition = createVector();
    this.currentMouseButtons = 0;
    this.previousMousePosition = createVector();
    this.previousMouseButtons = 0;

    this.dragAnchorPosition     = createVector();
    this.mouseDragStartPosition = createVector();
    this.dragDistance           = createVector();

    this.renderQueue = [];

    this.lineRenderer = new LineRenderer();

    this.textRenderer = new TextRenderer();
    this.textRenderer.setEllipsis(true);

    this.onMouseDown = (e) => this.onMouseDown(e);
    this.onMouseUp   = (e) => this.onMouseUp(e);
    this.onMouseMove = (e) => this.onMouseMove(e);
    this.onWheel     = (e) => this.onWheel(e);

    this.canvas.addEventListener("mousedown",   this.onMouseDown);
    this.canvas.addEventListener("wheel",       this.onMouseUp);

    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup",   this.onMouseMove);
  }

  removeDocumentEventListeners() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }

  getCanvasSize() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  setCanvasSize(ui: UiContext, size: Size) {
    const { canvas } = ui;

    canvas.width  = size && size.width  > 0 ? size.width  : 1;
    canvas.height = size && size.height > 0 ? size.height : 1;
  }

  beginFrame() {
    if (this.isMousePressed(UiContext.MOUSE_BUTTONS.PRIMARY)) {
      this.mouseDragStartPosition.x = this.currentMousePosition.x;
      this.mouseDragStartPosition.y = this.currentMousePosition.y;
    }

    if (this.isMouseReleased(UiContext.MOUSE_BUTTONS.PRIMARY)) {
      this.active = null;
    }

    if (this.isMouseDown(UiContext.MOUSE_BUTTONS.PRIMARY)) {
      this.dragDistance.x = this.currentMousePosition.x - this.mouseDragStartPosition.x;
      this.dragDistance.y = this.currentMousePosition.y - this.mouseDragStartPosition.y;
    }
  }

  endFrame() {
    this.previousMousePosition.x = this.currentMousePosition.x;
    this.previousMousePosition.y = this.currentMousePosition.y;
    this.previousMouseButtons    = this.currentMouseButtons;

    this.render();
  }

  render() {
    this.renderQueue.sort((a, b) => {
      const { sortOrder: aSortOrder = 0 } = a;
      const { sortOrder: bSortOrder = 0 } = b;
      return bSortOrder - aSortOrder;
    });

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not instantiate canvas context");
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    while (this.renderQueue.length > 0) {
      const shape = this.renderQueue.pop()!;

      if (shape.clipRegion) {
        ctx.save();
        ctx.clip(shape.clipRegion);
      }

      switch (shape.type) {
        case "line": {
          const { x, y, length, orientation, color } = shape;

          const currentColor = this.lineRenderer.getColor();
          if (currentColor !== color) {
            this.lineRenderer.setColor(color);
          }

          const draw = orientation === "horizontal"
            ? this.lineRenderer.hline.bind(this.lineRenderer)
            : this.lineRenderer.vline.bind(this.lineRenderer);

          draw(ctx, x, y, length);
        } break;
        case "rect": {
          const { x, y, width, height, color } = shape;

          ctx.fillStyle = color;
          ctx.fillRect(x, y, width, height);
        } break;
        case "text": {
          const { x, y, color, font, text, maxWidth } = shape;

          if (font !== this.textRenderer.glyphAtlas.font) this.textRenderer.setFont(font);
          if (color !== this.textRenderer.glyphAtlas.color) this.textRenderer.setColor(color);

          this.textRenderer.render(ctx, text, x, y, maxWidth);
        } break;
      }

      if (shape.clipRegion) {
        ctx.restore();
      }
    }
  }

  submitDraw(shape: Shape) {
    this.renderQueue.unshift(shape);
  }

  setAsActive(name: string, index?: number): void;
  setAsActive(id: Partial<UiId>): void;
  setAsActive(...args: any[]) {
    const id = UiContext.idFromArgs(...args);
    this.active = id;
  }

  setAsHot(name: string, index?: number): void;
  setAsHot(id: Partial<UiId>): void;
  setAsHot(...args: any[]) {
    if (!this.active) {
      const id = UiContext.idFromArgs(...args);
      this.hot = id;
    }
  }

  unsetAsHot(name: string, index?: number): void;
  unsetAsHot(id: Partial<UiId>): void;
  unsetAsHot(...args: any[]) {
    const id = UiContext.idFromArgs(...args);
    if (this.isHot(id)) {
      this.hot = null;
    }
  }

  isActive(name: string, index?: number): boolean;
  isActive(id: Partial<UiId>): boolean;
  isActive(...args: any[]) {
    if (this.active === null) {
      return false;
    }

    const id = UiContext.idFromArgs(...args);
    return shallowMatch(id, this.active);
  }

  isHot(name: string, index?: number): boolean;
  isHot(id: Partial<UiId>): boolean;
  isHot(...args: any[]) {
    if (this.hot === null) {
      return false;
    }

    const id = UiContext.idFromArgs(...args); 
    return shallowMatch(id, this.hot);
  }

  isAnyActive() {
    return this.active !== null;
  }

  isNoneActive() {
    return this.active === null;
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

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.updateMouseState(event);
  }

  onMouseUp(event: MouseEvent) {
    this.updateMouseState(event);
  }

  onMouseMove(event: MouseEvent)  {
    this.updateMouseState(event);
  }

  onWheel(_event: WheelEvent) {
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

  static idFromArgs(...args: any[]) {
    let id: UiId;
    if (isObject(args[0])) {
      id = args[0];
    } else {
      id = { name: args[0], index: args[1] }
    }
    return id;
  }
}

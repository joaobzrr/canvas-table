import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";
import { UiContext, UiId, CreateUiContextParams, Shape, Size } from "./types";
import { isObject, shallowMatch } from "./utils";

export const MOUSE_BUTTONS = {
  PRIMARY:   1,
  SECONDARY: 2,
  AUXILIARY: 4,
  FOURTH:    8,
  FIFTH:     16
};

export function create(params: CreateUiContextParams) {
  const { container, size } = params;

  const containerEl = document.getElementById(container);
  if (!containerEl) {
    throw new Error(`Element with id "${params.container}" could not be found`);
  }

  containerEl.replaceChildren();
  containerEl.style.overflow = "hidden";

  const wrapperEl = document.createElement("div");
  wrapperEl.classList.add("canvas-table-wrapper");
  containerEl.appendChild(wrapperEl);

  const canvas = document.createElement("canvas");
  canvas.width  = size && size.width  > 0 ? size.width  : 1;
  canvas.height = size && size.height > 0 ? size.height : 1;
  wrapperEl.appendChild(canvas);

  const hot = null;
  const active = null;

  const currentMousePosition = { x: 0, y: 0 };
  const currentMouseButtons = 0;
  const previousMousePosition = { x: 0, y: 0 };
  const previousMouseButtons = 0;

  const dragAnchorPosition     = { x: 0, y: 0 };
  const mouseDragStartPosition = { x: 0, y: 0 };
  const dragDistance           = { x: 0, y: 0 };

  const renderQueue: Shape[] = [];

  const lineRenderer = new LineRenderer();
  const textRenderer = new TextRenderer();

  const ui = {
    canvas,
    containerEl,
    wrapperEl,
    hot,
    active,
    currentMousePosition,
    currentMouseButtons,
    previousMousePosition,
    previousMouseButtons,
    dragAnchorPosition,
    mouseDragStartPosition,
    dragDistance,
    renderQueue,
    lineRenderer,
    textRenderer
  } as Partial<UiContext> as UiContext;

  ui.onMouseDown = (e) => onMouseDown(ui, e);
  ui.onMouseUp   = (e) => onMouseUp(ui, e);
  ui.onMouseMove = (e) => onMouseMove(ui, e);
  ui.onWheel     = (e) => onWheel(ui, e);

  canvas.addEventListener("mousedown",   ui.onMouseDown);
  canvas.addEventListener("wheel",       ui.onMouseUp);
  document.addEventListener("mousemove", ui.onMouseMove);
  document.addEventListener("mouseup",   ui.onMouseMove);

  return ui;
}

export function removeDocumentEventListeners(ui: UiContext) {
  const { onMouseMove, onMouseUp } = ui;

  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
}

export function getCanvasSize(ui: UiContext) {
  const { canvas } = ui;
  return {
    width: canvas.width,
    height: canvas.height
  };
}

export function setCanvasSize(ui: UiContext, size: Size) {
  const { canvas } = ui;

  canvas.width  = size && size.width  > 0 ? size.width  : 1;
  canvas.height = size && size.height > 0 ? size.height : 1;
}

export function beginFrame(ui: UiContext) {
  const { currentMousePosition, mouseDragStartPosition } = ui;

  if (isMousePressed(ui, MOUSE_BUTTONS.PRIMARY)) {
    mouseDragStartPosition.x = currentMousePosition.x;
    mouseDragStartPosition.y = currentMousePosition.y;
  }

  if (isMouseReleased(ui, MOUSE_BUTTONS.PRIMARY)) {
    ui.active = null;
  }

  if (isMouseDown(ui, MOUSE_BUTTONS.PRIMARY)) {
    ui.dragDistance.x = currentMousePosition.x - mouseDragStartPosition.x;
    ui.dragDistance.y = currentMousePosition.y - mouseDragStartPosition.y;
  }
}

export function endFrame(ui: UiContext) {
  ui.previousMousePosition.x = ui.currentMousePosition.x;
  ui.previousMousePosition.y = ui.currentMousePosition.y;
  ui.previousMouseButtons    = ui.currentMouseButtons;

  render(ui);
}

function render(ui: UiContext) {
  const { canvas, lineRenderer, textRenderer, renderQueue } = ui;

  renderQueue.sort((a, b) => {
    const { sortOrder: aSortOrder = 0 } = a;
    const { sortOrder: bSortOrder = 0 } = b;
    return bSortOrder - aSortOrder;
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not instantiate canvas context");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  while (renderQueue.length > 0) {
    const shape = renderQueue.pop()!;

    if (shape.clipRegion) {
      ctx.save();
      ctx.clip(shape.clipRegion);
    }

    switch (shape.type) {
      case "line": {
        const { x, y, length, orientation, color } = shape;

        const currentColor = lineRenderer.getColor();
        if (currentColor !== color) {
          lineRenderer.setColor(color);
        }

        const draw = orientation === "horizontal"
          ? lineRenderer.hline.bind(lineRenderer)
          : lineRenderer.vline.bind(lineRenderer);

        draw(ctx, x, y, length);
      } break;
      case "rect": {
        const { x, y, width, height, color } = shape;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
      } break;
      case "text": {
        const { x, y, font, text, maxWidth, ellipsis } = shape;

        textRenderer.render(ctx, font, text, x, y, maxWidth, ellipsis);
      } break;
    }

    if (shape.clipRegion) {
      ctx.restore();
    }
  }
}

export function submitDraw(ui: UiContext, shape: Shape) {
  const { renderQueue } = ui;
  renderQueue.unshift(shape);
}

export function setAsActive(ui: UiContext, name: string, index?: number): void;
export function setAsActive(ui: UiContext, id: Partial<UiId>): void;
export function setAsActive(ui: UiContext, ...args: any[]) {
  const id = idFromArgs(...args);
  ui.active = id;
}

export function setAsHot(ui: UiContext, name: string, index?: number): void;
export function setAsHot(ui: UiContext, id: Partial<UiId>): void;
export function setAsHot(ui: UiContext, ...args: any[]) {
  if (!ui.active) {
    const id = idFromArgs(...args);
    ui.hot = id;
  }
}

export function unsetAsHot(ui: UiContext, name: string, index?: number): void;
export function unsetAsHot(ui: UiContext, id: Partial<UiId>): void;
export function unsetAsHot(ui: UiContext, ...args: any[]) {
  const id = idFromArgs(...args);
  if (isHot(ui, id)) {
    ui.hot = null;
  }
}
export function isActive(ui: UiContext, name: string, index?: number): boolean;
export function isActive(ui: UiContext, id: Partial<UiId>): boolean;
export function isActive(ui: UiContext, ...args: any[]) {
  const { active } = ui;
  if (active === null) {
    return false;
  }

  const id = idFromArgs(...args);
  return shallowMatch(id, active);
}

export function isHot(ui: UiContext, name: string, index?: number): boolean;
export function isHot(ui: UiContext, id: Partial<UiId>): boolean;
export function isHot(ui: UiContext, ...args: any[]) {
  const { hot } = ui;
  if (hot === null) {
    return false;
  }

  const id = idFromArgs(...args); 
  return shallowMatch(id, hot);
}

export function isAnyActive(ui: UiContext) {
  return ui.active !== null;
}

export function isNoneActive(ui: UiContext) {
  return ui.active === null;
}

export function isMouseDown(ui: UiContext, button: number) {
  return ui.currentMouseButtons & button;
}

export function isMouseUp(ui: UiContext, button: number) {
  return !(ui.currentMouseButtons & button);
}

export function isMousePressed(ui: UiContext, button: number) {
  const { currentMouseButtons, previousMouseButtons } = ui;
  return (currentMouseButtons & button) === 1 && (previousMouseButtons & button) === 0;
}

export function isMouseReleased(ui: UiContext, button: number) {
  const { currentMouseButtons, previousMouseButtons } = ui;
  return (currentMouseButtons & button) === 0 && (previousMouseButtons & button) === 1;
}

function onMouseDown(ui: UiContext, event: MouseEvent) {
  event.preventDefault();
  updateMouseState(ui, event);
}

function idFromArgs(...args: any[]) {
  let id: UiId;
  if (isObject(args[0])) {
    id = args[0];
  } else {
    id = { name: args[0], index: args[1] }
  }
  return id;
}

function onMouseUp(ct: UiContext, event: MouseEvent) {
  updateMouseState(ct, event);
}

function onMouseMove(ct: UiContext, event: MouseEvent)  {
  updateMouseState(ct, event);
}

function onWheel(_ct: UiContext, _event: WheelEvent) {
}

function updateMouseState(ui: UiContext, event: MouseEvent) {
  const { wrapperEl } = ui;

  const bcr = wrapperEl.getBoundingClientRect();

  const currentMousePosition = {
    x: event.clientX - bcr.x,
    y: event.clientY - bcr.y 
  };
  ui.currentMousePosition = currentMousePosition;
  ui.currentMouseButtons = event.buttons;
}

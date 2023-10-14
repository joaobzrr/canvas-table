import { LineRenderer } from "./LineRenderer";
import { TextRenderer } from "./TextRenderer";
import {
  UiContext,
  UiId,
  Vector,
  CreateUiContextParams,
  Shape,
  Size
} from "./types";
import { shallowMatch } from "./utils";

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

  const currMousePosition = { x: 0, y: 0 };
  const currMouseButtons = 0;
  const prevMousePosition = { x: 0, y: 0 };
  const prevMouseButtons = 0;

  const dragAnchorPosition     = { x: 0, y: 0 };
  const mouseDragStartPosition = { x: 0, y: 0 };
  const dragDistance           = { x: 0, y: 0 };

  const renderQueue: Shape[] = [];

  const lineRenderer = new LineRenderer();
  const textRenderer = new TextRenderer();

  const uiContext = {
    canvas,
    containerEl,
    wrapperEl,
    hot,
    active,
    currMousePosition,
    currMouseButtons,
    prevMousePosition,
    prevMouseButtons,
    dragAnchorPosition,
    mouseDragStartPosition,
    dragDistance,
    renderQueue,
    lineRenderer,
    textRenderer
  } as Partial<UiContext> as UiContext;

  uiContext.onMouseDown = (e) => onMouseDown(uiContext, e);
  uiContext.onMouseUp   = (e) => onMouseUp(uiContext, e);
  uiContext.onMouseMove = (e) => onMouseMove(uiContext, e);
  uiContext.onWheel     = (e) => onWheel(uiContext, e);

  canvas.addEventListener("mousedown",   uiContext.onMouseDown);
  canvas.addEventListener("wheel",       uiContext.onMouseUp);
  document.addEventListener("mousemove", uiContext.onMouseMove);
  document.addEventListener("mouseup",   uiContext.onMouseMove);

  return uiContext;
}

export function removeDocumentEventListeners(uiContext: UiContext) {
  const { onMouseMove, onMouseUp } = uiContext;

  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
}

export function getCanvasSize(uiContext: UiContext) {
  const { canvas } = uiContext;
  return {
    width: canvas.width,
    height: canvas.height
  };
}

export function setCanvasSize(uiContext: UiContext, size: Size) {
  const { canvas } = uiContext;

  canvas.width  = size && size.width  > 0 ? size.width  : 1;
  canvas.height = size && size.height > 0 ? size.height : 1;
}

export function beginFrame(uiContext: UiContext) {
  const { currMousePosition, mouseDragStartPosition } = uiContext;

  if (isMousePressed(uiContext, MOUSE_BUTTONS.PRIMARY)) {
    mouseDragStartPosition.x = currMousePosition.x;
    mouseDragStartPosition.y = currMousePosition.y;
  }

  if (isMouseReleased(uiContext, MOUSE_BUTTONS.PRIMARY)) {
    uiContext.active = null;
  }

  if (isMouseDown(uiContext, MOUSE_BUTTONS.PRIMARY)) {
    const dragDistanceX = currMousePosition.x - mouseDragStartPosition.x;
    const dragDistanceY = currMousePosition.y - mouseDragStartPosition.y;
    uiContext.dragDistance = {
      x: dragDistanceX,
      y: dragDistanceY
    };
  }
}

export function endFrame(uiContext: UiContext) {
  uiContext.prevMousePosition.x = uiContext.currMousePosition.x;
  uiContext.prevMousePosition.y = uiContext.currMousePosition.y;
  uiContext.prevMouseButtons    = uiContext.currMouseButtons;

  render(uiContext);
}

function render(uiContext: UiContext) {
  const { canvas, lineRenderer, textRenderer, renderQueue } = uiContext;

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

export function submitDraw(uiContext: UiContext, shape: Shape) {
  const { renderQueue } = uiContext;
  renderQueue.unshift(shape);
}

export function setAsActive(uiContext: UiContext, id: UiId | null) {
  uiContext.active = id;
}

export function setAsHot(uiContext: UiContext, id: UiId) {
  if (!uiContext.active) {
    uiContext.hot = id;
  }
}

export function unsetAsHot(uiContext: UiContext, id: UiId) {
  if (isHot(uiContext, id)) {
    uiContext.hot = null;
  }
}

export function isActive(uiContext: UiContext, id: UiId) {
  return uiContext.active ? shallowMatch(id, uiContext.active): false;
}

export function isHot(uiContext: UiContext, id: Partial<UiId>) {
  return uiContext.hot ? shallowMatch(id, uiContext.hot): false;
}

export function getCurrentMousePosition(uiContext: UiContext) {
  return uiContext.currMousePosition;
}

export function getMouseDragStartPosition(uiContext: UiContext) {
  return uiContext.mouseDragStartPosition;
}

export function getDragAnchorPosition(uiContext: UiContext) {
  return uiContext.dragAnchorPosition;
}

export function setDragAnchorPosition(uiContext: UiContext, dragAnchorPosition: Vector) {
  uiContext.dragAnchorPosition = dragAnchorPosition;
}

export function getDragDistance(uiContext: UiContext) {
  return uiContext.dragDistance;
}

export function isMouseDown(uiContext: UiContext, button: number) {
  return uiContext.currMouseButtons & button;
}

export function isMouseUp(uiContext: UiContext, button: number) {
  return !(uiContext.currMouseButtons & button);
}

export function isMousePressed(uiContext: UiContext, button: number) {
  const { currMouseButtons, prevMouseButtons } = uiContext;
  return (currMouseButtons & button) === 1 && (prevMouseButtons & button) === 0;
}

export function isMouseReleased(uiContext: UiContext, button: number) {
  const { currMouseButtons, prevMouseButtons } = uiContext;
  return (currMouseButtons & button) === 0 && (prevMouseButtons & button) === 1;
}

function onMouseDown(uiContext: UiContext, event: MouseEvent) {
  event.preventDefault();
  updateMouseState(uiContext, event);
}

function onMouseUp(ct: UiContext, event: MouseEvent) {
  updateMouseState(ct, event);
}

function onMouseMove(ct: UiContext, event: MouseEvent)  {
  updateMouseState(ct, event);
}

function onWheel(_ct: UiContext, _event: WheelEvent) {
}

function updateMouseState(uiContext: UiContext, event: MouseEvent) {
  const { wrapperEl } = uiContext;

  const bcr = wrapperEl.getBoundingClientRect();

  const currMousePos = {
    x: event.clientX - bcr.x,
    y: event.clientY - bcr.y 
  };
  uiContext.currMousePosition = currMousePos;
  uiContext.currMouseButtons = event.buttons;
}

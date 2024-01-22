import { get_context, is_point_in_rect } from "./utils";
import { GUI_Context, Mouse_Button_Value } from "./types";
import { MOUSE_BUTTONS } from "./constants";

export function make_gui_context(container_id: string): GUI_Context {
  const container_el = document.getElementById(container_id);
  if (!container_el) {
    throw new Error(`Element with id "${container_id}" could not be found`);
  }
  container_el.replaceChildren();
  container_el.style.overflow = "hidden";

  const wrapper_el = document.createElement("div");
  wrapper_el.style.height = "100%";
  wrapper_el.classList.add("canvas-table-wrapper");
  container_el.appendChild(wrapper_el);

  const canvas = document.createElement("canvas");
  wrapper_el.appendChild(canvas);

  const font_metrics_canvas = document.createElement("canvas");
  const font_metrics_canvas_ctx = get_context(font_metrics_canvas);

  const guictx = {
    container_el: container_el as HTMLDivElement,
    wrapper_el,
    canvas,
    font_metrics_canvas,
    font_metrics_canvas_ctx,

    curr_mouse_x: 0,
    curr_mouse_y: 0,
    curr_mouse_buttons: 0,
    prev_mouse_buttons: 0,
    drag_anchor_x: 0,
    drag_anchor_y: 0,
    drag_start_x: 0,
    drag_start_y: 0,
    drag_distance_x: 0,
    drag_distance_y: 0,
    scroll_amount_x: 0,
    scroll_amount_y: 0,

    hot_widget: null,
    active_widget: null
  } as GUI_Context;

  guictx.mouse_down_handler = (e) => on_mouse_down(guictx, e);
  guictx.mouse_up_handler = (e) => on_mouse_up(guictx, e);
  guictx.mouse_move_handler = (e) => on_mouse_move(guictx, e);
  guictx.wheel_handler = (e) => on_wheel(guictx, e);
  guictx.visibility_change_handler = () => on_visibility_change(guictx);

  canvas.addEventListener("mousedown", guictx.mouse_down_handler);
  canvas.addEventListener("wheel", guictx.wheel_handler);
  document.addEventListener("mousemove", guictx.mouse_move_handler);
  document.addEventListener("mouseup", guictx.mouse_up_handler);
  document.addEventListener("visibilitychange", guictx.visibility_change_handler);

  return guictx;
}

export function destroy_gui_context(guictx: GUI_Context) {
  stop_animation(guictx);

  document.removeEventListener("mousemove", guictx.mouse_move_handler);
  document.removeEventListener("mouseup", guictx.mouse_up_handler);
  document.removeEventListener("visibilitychange", guictx.visibility_change_handler);
}

export function start_animation(guictx: GUI_Context) {
  if (guictx.raf_id === undefined) {
    guictx.raf_id = requestAnimationFrame(() => animate(guictx));
  }
}

export function stop_animation(guictx: GUI_Context) {
  if (guictx.raf_id !== undefined) {
    cancelAnimationFrame(guictx.raf_id);
    guictx.raf_id = undefined;
  }
}

export function get_font_metrics(guictx: GUI_Context, font: string) {
  const { font_metrics_canvas_ctx: ctx } = guictx;

  ctx.font = font;
  const { fontBoundingBoxAscent, fontBoundingBoxDescent } = ctx.measureText("M");

  return {
    fontBoundingBoxAscent,
    fontBoundingBoxDescent
  };
}

export function set_active_widget(guictx: GUI_Context, id: string | null) {
  guictx.active_widget = id;
}

export function set_hot_widget(guictx: GUI_Context, id: string | null) {
  if (id === null) {
    guictx.hot_widget = null;
  } else if (!guictx.active_widget) {
    guictx.hot_widget = id;
  }
}

export function is_widget_active(guictx: GUI_Context, id: string | null) {
  return guictx.active_widget === id;
}

export function is_widget_hot(guictx: GUI_Context, id: string | null) {
  return guictx.hot_widget === id;
}

export function is_any_widget_hot(guictx: GUI_Context) {
  return guictx.hot_widget !== null;
}

export function is_any_widget_active(guictx: GUI_Context) {
  return guictx.active_widget !== null;
}

export function is_no_widget_hot(guictx: GUI_Context) {
  return guictx.hot_widget === null;
}

export function is_no_widget_active(guictx: GUI_Context) {
  return guictx.active_widget === null;
}

export function is_mouse_in_rect(
  guictx: GUI_Context,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  const { curr_mouse_x, curr_mouse_y } = guictx;
  return is_point_in_rect(curr_mouse_x, curr_mouse_y, rx, ry, rw, rh);
}

export function is_mouse_down(guictx: GUI_Context, button: Mouse_Button_Value) {
  const value = normalized_to_buttons_value(button);
  return guictx.curr_mouse_buttons & value;
}

export function is_mouse_pressed(guictx: GUI_Context, button: Mouse_Button_Value) {
  const value = normalized_to_buttons_value(button);
  return (guictx.curr_mouse_buttons & value) === 1 && (guictx.prev_mouse_buttons & value) === 0;
}

export function is_mouse_released(guictx: GUI_Context, button: Mouse_Button_Value) {
  const value = normalized_to_buttons_value(button);
  return (guictx.curr_mouse_buttons & value) === 0 && (guictx.prev_mouse_buttons & value) === 1;
}

function normalized_to_buttons_value(value: Mouse_Button_Value): number {
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

function animate(guictx: GUI_Context) {
  const { container_el, canvas } = guictx;

  if (container_el.offsetWidth !== canvas.width || container_el.offsetHeight !== canvas.height) {
    canvas.width = container_el.offsetWidth;
    canvas.height = container_el.offsetHeight;
  }

  if (is_mouse_pressed(guictx, MOUSE_BUTTONS.PRIMARY)) {
    guictx.drag_start_x = guictx.curr_mouse_x;
    guictx.drag_start_y = guictx.curr_mouse_y;
  }

  if (is_mouse_down(guictx, MOUSE_BUTTONS.PRIMARY)) {
    guictx.drag_distance_x = guictx.curr_mouse_x - guictx.drag_start_x;
    guictx.drag_distance_y = guictx.curr_mouse_y - guictx.drag_start_y;
  }

  guictx.update_function?.();

  guictx.prev_mouse_buttons = guictx.curr_mouse_buttons;
  guictx.scroll_amount_x = 0;
  guictx.scroll_amount_y = 0;

  guictx.raf_id = requestAnimationFrame(() => animate(guictx));
}

function update_mouse_state(guictx: GUI_Context, event: MouseEvent) {
  const bcr = guictx.wrapper_el.getBoundingClientRect();
  guictx.curr_mouse_x = event.clientX - bcr.x;
  guictx.curr_mouse_y = event.clientY - bcr.y;
  guictx.curr_mouse_buttons = event.buttons;
}

function on_mouse_down(guictx: GUI_Context, event: MouseEvent) {
  event.preventDefault();
  update_mouse_state(guictx, event);
}

function on_mouse_up(guictx: GUI_Context, event: MouseEvent) {
  update_mouse_state(guictx, event);
}

function on_mouse_move(guictx: GUI_Context, event: MouseEvent) {
  update_mouse_state(guictx, event);
}

function on_wheel(guictx: GUI_Context, event: WheelEvent) {
  guictx.scroll_amount_x = event.deltaX;
  guictx.scroll_amount_y = event.deltaY;
}

function on_visibility_change(guictx: GUI_Context) {
  if (document.hidden) {
    stop_animation(guictx);
  } else {
    start_animation(guictx);
  }
}

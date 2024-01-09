import { shallow_match, is_object } from "./utils";

export type UI_Context = {
  hot: UI_ID | null;
  active: UI_ID | null;
};

export type UI_ID = {
  name: string;
  index?: number;
};

export function make_ui_context() {
  return { hot: null, active: null };
}

export function set_as_active(ui_context: UI_Context, id: null): void;
export function set_as_active(ui_context: UI_Context, name: string, index?: number): void;
export function set_as_active(ui_context: UI_Context, id: Partial<UI_ID>): void;
export function set_as_active(ui_context: UI_Context, ...args: any[]) {
  if (args[0] === null) {
    ui_context.active = null;
  } else {
    ui_context.active = create_id(...args);
  }
}

export function set_as_hot(ui_context: UI_Context, name: string, index?: number): void;
export function set_as_hot(ui_context: UI_Context, id: Partial<UI_ID>): void;
export function set_as_hot(ui_context: UI_Context, ...args: any[]) {
  if (!ui_context.active) {
    ui_context.hot = create_id(...args);
  }
}

export function unset_as_hot(ui_context: UI_Context, name: string, index?: number): void;
export function unset_as_hot(ui_context: UI_Context, id: Partial<UI_ID>): void;
export function unset_as_hot(ui_context: UI_Context, ...args: any[]) {
  const id = create_id(...args);
  if (is_hot(ui_context, id)) {
    ui_context.hot = null;
  }
}

export function is_active(ui_context: UI_Context, name: string, index?: number): boolean;
export function is_active(ui_context: UI_Context, id: Partial<UI_ID>): boolean;
export function is_active(ui_context: UI_Context, ...args: any[]) {
  if (ui_context.active === null) {
    return false;
  }

  return shallow_match(create_id(...args), ui_context.active);
}

export function is_hot(ui_context: UI_Context, name: string, index?: number): boolean;
export function is_hot(ui_context: UI_Context, id: Partial<UI_ID>): boolean;
export function is_hot(ui_context: UI_Context, ...args: any[]) {
  if (ui_context.hot === null) {
    return false;
  }

  return shallow_match(create_id(...args), ui_context.hot);
}

export function is_any_hot(ui_context: UI_Context) {
  return ui_context.hot !== null;
}

export function is_any_active(ui_context: UI_Context) {
  return ui_context.active !== null;
}

export function is_none_hot(ui_context: UI_Context) {
  return ui_context.hot === null;
}

export function is_none_active(ui_context: UI_Context) {
  return ui_context.active === null;
}

export function create_id(...args: any[]) {
  let id: UI_ID;
  if (is_object(args[0])) {
    id = args[0];
  } else {
    id = { name: args[0], index: args[1] };
  }
  return id;
}

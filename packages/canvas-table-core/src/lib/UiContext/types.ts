import { Size } from "../../types";

export type CreateUiContextParams = {
  container: string;
  size?: Size;
}

export type UiId = {
  name:   string;
  index?: number;
}

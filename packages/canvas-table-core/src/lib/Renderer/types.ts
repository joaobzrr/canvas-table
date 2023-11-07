export type BaseShape = {
  type: string;
  x: number;
  y: number;
  color: string;
  opacity?: number;
  clipRegion?: Path2D;
  sortOrder?: number;
};

export type LineOrientation = "horizontal" | "vertical";

export type LineShape = BaseShape & {
  type: "line";
  orientation: LineOrientation;
  length: number;
};

export type RectShape = BaseShape & {
  type: "rect";
  width: number;
  height: number;
};

export type TextShape = BaseShape & {
  type: "text";
  font: string;
  text: string;
  maxWidth?: number;
};

export type Shape = LineShape | RectShape | TextShape;

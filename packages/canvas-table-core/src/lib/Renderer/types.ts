export type BaseShape = {
  type: string;
  x: number;
  y: number;
  opacity?: number;
  clipRegion?: Path2D;
  sortOrder?: number;
};

export type LineOrientation = "horizontal" | "vertical";

export type LineShape = BaseShape & {
  type: "line";
  orientation: LineOrientation;
  length: number;
  color: string;
};

export type RectShape = BaseShape & {
  type: "rect";
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
};

export type TextShape = BaseShape & {
  type: "text";
  font: string;
  text: string;
  maxWidth?: number;
  color: string;
};

export type Shape = LineShape | RectShape | TextShape;

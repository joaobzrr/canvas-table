export type DrawLineCommand = BaseDrawCommand & {
  type: 'line';
  orientation: LineOrientation;
  length: number;
  color: string;
};

export type DrawRectCommand = BaseDrawCommand & {
  type: 'rect';
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
};

export type DrawTextCommand = BaseDrawCommand & {
  type: 'text';
  chars: string[];
  subpixelOffsets: number[];
  font: string;
  color: string;
};

export type BaseDrawCommand = {
  type: string;
  x: number;
  y: number;
  opacity?: number;
  clipRegion?: Path2D;
  sortOrder?: number;
};

export type DrawCommand = DrawLineCommand | DrawRectCommand | DrawTextCommand;

export type LineOrientation = 'horizontal' | 'vertical';

export type TextureNode = {
  rect: Rect;
  left: TextureNode | null;
  right: TextureNode | null;
  filled: boolean;
}

export type Rect = {
  x: number,
  y: number,
  width: number,
  height: number
}

export type Size = {
  width: number;
  height: number;
}

export type GlyphAtlasOptions = {
  textureWidth?:  number;
  textureHeight?: number;
}

export type TextureNode = {
  rect: Rect;
  left: TextureNode | null;
  right: TextureNode | null;
  filled: boolean;
  glyphData?: GlyphData;
}

export type GlyphData = {
  rect: Rect;
  verticalShift: number;
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

export type Font = {
  family: string;
  size: string;
  style: FontStyle
  color: string;
}

export type FontStyle = "normal" | "bold" | "italic" | "both";

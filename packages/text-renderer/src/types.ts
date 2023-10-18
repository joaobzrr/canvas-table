export type TextRenderer = {
  glyphAtlas: GlyphAtlas;
}

export type GlyphAtlas = {
  canvas: HTMLCanvasElement;
  cache: Map<string, Node>;
  root: Node;
  font: string;
  fontHeight: number;
  color: string;
}

export type GlyphAtlasParams = {
  atlasWidth: number;
  atlasHeight: number;
  font: string;
  color: string;
}

export type Node = {
  left: Node | null;
  right: Node | null;

  filled: boolean;

  binWidth: number;
  binHeight: number;

  metrics: GlyphMetrics;
}

export type GlyphMetrics = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  
  hshift:  number;
  vshift:  number;
  advance: number;
}

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Size = {
  width:  number;
  height: number;
}

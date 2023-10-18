export function makeFontSpecifier(fontFamily: string, fontSize: number, fontStyle?: string) {
  let font = `${fontSize}px ${fontFamily}`;
  if (!fontStyle) {
    return font;
  }

  switch (fontStyle) {
    case "bold": {
      font = "bold " + font;
    } break;
    case "italic": {
      font = "italic " + font;
    } break;
    case "both": {
      font = "italic bold " + font;
    } break;
  }
  return font;
}

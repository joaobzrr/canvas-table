export function createFontSpecifier(fontFamily: string, fontSize: string, fontStyle: string) {
  return [fontStyle, fontSize, fontFamily].join(" ");
}

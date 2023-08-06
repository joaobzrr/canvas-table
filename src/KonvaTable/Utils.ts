import { FontSpecifier, Nullable } from "./types";

export class Utils {
  static scale(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) {
    if (value <= fromMin) {
      return toMin;
    } else if (value >= fromMax) {
      return toMax;
    } else {
      return Math.round((value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin);
    }
  }

  static hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static joinStrings(strings: Nullable<string>[], sep = "") {
    let result = "";
    for (const str of strings) {
      if (str === undefined || str === null) {
        continue;
      }
      result += str;
      result += sep;
    }
    return result;
  }

  static serializeFontSpecifier(specifier: FontSpecifier) {
    return Utils.joinStrings([
      specifier?.fontStyle,
      specifier?.fontWeight,
      specifier.fontSize,
      specifier.fontFamily
    ], " ");
  }
}

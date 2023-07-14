export class MathUtils {
  static scale(value:  number, fromMin: number, fromMax: number, toMin: number, toMax: number) {
    if (value <= fromMin) {
      return toMin;
    } else if (value >= fromMax) {
      return toMax;
    } else {
      return Math.round((value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin);
    }
  }
}

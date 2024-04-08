export class PreparedText {
  chars: string[] = [];
  subpixelOffsets: number[] = [];

  pushChar(char: string, subpixelOffset: number) {
    this.chars.push(char);
    this.subpixelOffsets.push(subpixelOffset);
  }
}

export function createFontSpecifier(fontFamily: string, fontSize: string, fontStyle: string) {
  return [fontStyle, fontSize, fontFamily].join(' ');
}

export function isWhitespace(c: string) {
  return (
    c === ' ' ||
    c === '\n' ||
    c === '\t' ||
    c === '\r' ||
    c === '\f' ||
    c === '\v' ||
    c === '\u00a0' ||
    c === '\u1680' ||
    c === '\u2000' ||
    c === '\u200a' ||
    c === '\u2028' ||
    c === '\u2029' ||
    c === '\u202f' ||
    c === '\u205f' ||
    c === '\u3000' ||
    c === '\ufeff'
  );
}

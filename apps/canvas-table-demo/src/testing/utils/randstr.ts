import { choice } from "./choice";

export function randstr(charset: string[], length: number) {
  const chars = [];
  for (let i = 0; i < length; i++) {
    chars.push(choice(charset));
  }
  const result = chars.join("");
  return result;
}

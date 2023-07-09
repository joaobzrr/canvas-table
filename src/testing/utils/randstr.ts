import { randint } from "./randint";

export function randstr(length: number) {
  const chars = [];
  for (let i = 0; i < length; i++) {
      chars.push(String.fromCharCode(randint(65, 90)));
  }
  const result = chars.join("");
  return result;
}

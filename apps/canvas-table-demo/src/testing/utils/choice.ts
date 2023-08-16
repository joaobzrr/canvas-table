import { randint } from "./randint";

export function choice<T extends any>(options: T[]): T {
  const index = randint(0, options.length)
  return options[index];
}

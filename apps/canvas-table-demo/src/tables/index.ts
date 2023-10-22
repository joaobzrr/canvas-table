import * as random from "./random.json";
import * as pokemon from "./pokemon";

export const tables = [
  {
    id: "1",
    name: "Random",
    columnDefs: random.columnDefs,
    dataRows: random.dataRows
  },
  {
    id: "2",
    name: "Pokemon",
    columnDefs: pokemon.columnDefs,
    dataRows: pokemon.dataRows
  },
];

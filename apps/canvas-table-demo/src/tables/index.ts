import * as random from "./random.json";
import * as pokemon from "./pokemon";
import * as empty from "./empty";

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
  {
    id: "3",
    name: "Empty",
    columnDefs: empty.columnDefs,
    dataRows: empty.dataRows
  }
];

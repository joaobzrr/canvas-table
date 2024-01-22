import * as random from "./random.json";
import * as pokemon from "./pokemon";
import * as empty from "./empty";
import * as beatles from "./beatles";

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
  },
  {
    id: "4",
    name: "Beatles",
    columnDefs: beatles.columnDefs,
    dataRows: beatles.dataRows
  }
];

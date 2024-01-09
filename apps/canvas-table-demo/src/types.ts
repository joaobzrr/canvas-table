import React from "react";
import { Column_Def, Data_Row } from "@bzrr/canvas-table-core";

export type Table = {
  id: string;
  name: string;
  columnDefs: Column_Def[];
  dataRows: Data_Row[];
};

export type TabItem = {
  label: string;
  key: React.Key;
};

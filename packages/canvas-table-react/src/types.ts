import { Create_Canvas_Table_Params } from "@bzrr/canvas-table-core";

export type CanvasTableProps = Omit<Create_Canvas_Table_Params, "container"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
};

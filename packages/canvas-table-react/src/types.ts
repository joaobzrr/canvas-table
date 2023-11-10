import { CreateCanvasTableParams } from "@bzrr/canvas-table-core";

export type CanvasTableProps = Omit<CreateCanvasTableParams, "container"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
};

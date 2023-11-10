import { CreateCanvasTableParams } from "@bzrr/canvas-table-core";
import { ForwardRefExoticComponent, PropsWithoutRef, RefAttributes } from "react";

type OmittedCanvasTableParams = "container" | "onDoubleClickCell";
export type CanvasTableProps = Omit<CreateCanvasTableParams, OmittedCanvasTableParams> & {
  CellInput?: CellInputComponent,
  onCellInputChange?: (key: string, value: string) => void;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export type CellInputProps = {
  onKeyDown: (event: React.KeyboardEvent) => void;
  style: React.CSSProperties;
}

export type CellInputComponent = ForwardRefExoticComponent<
  PropsWithoutRef<CellInputProps> & RefAttributes<HTMLInputElement>>;

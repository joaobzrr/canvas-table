import { useRef, useLayoutEffect, forwardRef } from "react";
import { CanvasTable, CreateCanvasTableParams } from "@bzrr/canvas-table-core";
import { useUpdateEffect } from "./hooks";

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export type CanvasTableProps = Omit<CreateCanvasTableParams, "container"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const CanvasTableComponent = forwardRef<HTMLDivElement, CanvasTableProps>((props, ref) => {
  const {
    columnDefs,
    dataRows,
    theme,
    size,
    containerClassName,
    containerStyle,
    ...rest
  } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(getContainerId());

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      columnDefs,
      dataRows,
      theme,
      size,
      ...rest
    });

    return () => {
      canvasTableRef.current!.cleanup();
      canvasTableRef.current = null;
    }
  }, []);

  useUpdateEffect(() => {
    canvasTableRef.current!.setColumnDefs(columnDefs);
  }, [columnDefs]);

  useUpdateEffect(() => {
    canvasTableRef.current!.setDataRows(dataRows);
  }, [dataRows]);

  useUpdateEffect(() => {
    if (theme) {
      canvasTableRef.current!.setTheme(theme);
    }
  }, [theme]);

  useUpdateEffect(() => {
    if (size) {
      canvasTableRef.current!.setSize(size);
    }
  }, [size]);

  return (
    <div
      id={containerIdRef.current}
      className={containerClassName}
      style={containerStyle}
      ref={ref}
    />
  );
});

import { useRef, useLayoutEffect, forwardRef } from "react";
import { CanvasTable, CreateCanvasTableParams } from "@canvas-table/core";
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
    size,
    theme,
    onSelect,
    containerClassName,
    containerStyle
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
      onSelect
    });

    return () => {
      canvasTableRef.current!.cleanup();
      canvasTableRef.current = null;
    }
  }, []);

  useUpdateEffect(() => {
    if (canvasTableRef.current) {
      canvasTableRef.current.set({
        columnDefs,
        dataRows,
        size,
        theme
      });
    }
  }, [columnDefs, dataRows, size, theme]);

  return (
    <div
      id={containerIdRef.current}
      className={containerClassName}
      style={containerStyle}
      ref={ref}
    />
  );
});

import { useRef, useLayoutEffect, forwardRef } from "react";
import { create, set, cleanup, CanvasTable, CreateCanvasTableParams } from "canvas-table-core-2";
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

const CanvasTableComponent = forwardRef<HTMLDivElement, CanvasTableProps>((props, ref) => {
  const {
    columnDefs,
    dataRows,
    size,
    theme,
    containerClassName,
    containerStyle
  } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(getContainerId());

  useLayoutEffect(() => {
    canvasTableRef.current = create({
      container: containerIdRef.current,
      columnDefs,
      dataRows,
      theme,
      size
    });

    return () => {
      cleanup(canvasTableRef.current!);
      canvasTableRef.current = null;
    }
  }, []);

  useUpdateEffect(() => {
    if (canvasTableRef.current) {
      set(canvasTableRef.current, {
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

export default CanvasTableComponent;

import { useRef, useLayoutEffect, forwardRef } from "react";
import { CanvasTable, CanvasTableParams } from "canvas-table-core";
import { useUpdateEffect } from "./hooks";

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export type CanvasTableProps = Omit<CanvasTableParams, "container"> & {
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
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      columnDefs,
      dataRows,
      theme,
      size
    });

    return () => {
      canvasTableRef.current!.cleanup();
      canvasTableRef.current = null;
    }
  }, []);

  useUpdateEffect(() => {
    if (canvasTableRef.current) {
      canvasTableRef.current.setContent(columnDefs, dataRows);
    }
  }, [columnDefs, dataRows]);

  useUpdateEffect(() => {
    if (canvasTableRef.current && theme) {
      canvasTableRef.current.setTheme(theme);
    }
  }, [theme]);

  useUpdateEffect(() => {
    if (canvasTableRef.current && size) {
      canvasTableRef.current.setSize(size);
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

export default CanvasTableComponent;

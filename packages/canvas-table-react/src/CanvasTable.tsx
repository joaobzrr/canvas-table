import { useRef, useLayoutEffect, forwardRef } from "react";
import {
  canvasTableCreate,
  canvasTableSetContent,
  canvasTableSetSize,
  canvasTableSetTheme,
  canvasTableCleanup,
  CanvasTable,
  CanvasTableParams
} from "canvas-table-core";
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
    canvasTableRef.current = canvasTableCreate({
      container: containerIdRef.current,
      columnDefs,
      dataRows,
      theme,
      size
    });

    return () => {
      canvasTableCleanup(canvasTableRef.current);
      canvasTableRef.current = null;
    }
  }, []);

  useUpdateEffect(() => {
    if (canvasTableRef.current) {
      canvasTableSetContent(canvasTableRef.current, columnDefs, dataRows);
    }
  }, [columnDefs, dataRows]);

  useUpdateEffect(() => {
    if (canvasTableRef.current && size) {
      canvasTableSetSize(canvasTableRef.current, size);
    }
  }, [size]);

  useUpdateEffect(() => {
    if (canvasTableRef.current && theme) {
      canvasTableSetTheme(canvasTableRef.current, theme);
    }
  }, [theme]);

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

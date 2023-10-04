import { useRef, useLayoutEffect, forwardRef } from "react";
import {
  create,
  setContent,
  setSize,
  setTheme,
  cleanup,
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
      setContent(canvasTableRef.current, columnDefs, dataRows);
    }
  }, [columnDefs, dataRows]);

  useUpdateEffect(() => {
    if (canvasTableRef.current && size) {
      setSize(canvasTableRef.current, size);
    }
  }, [size]);

  useUpdateEffect(() => {
    if (canvasTableRef.current && theme) {
      setTheme(canvasTableRef.current, theme);
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

import { useRef, useLayoutEffect } from "react";
import { CanvasTable } from "@bzrr/canvas-table-core";
import { useElementSize, useUpdateEffect } from "./hooks";
import { CanvasTableProps } from "./types";

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export function CanvasTableComponent(props: CanvasTableProps) {
  const {
    columnDefs,
    dataRows,
    theme,
    containerClassName,
    containerStyle,
    onSelectRow,
    onEditCell,
    onResizeColumn,
    ...rest
  } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(getContainerId());

  const [elementSize, elementRef] = useElementSize();

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      columnDefs,
      dataRows,
      theme,
      size: elementSize,
      onSelectRow,
      onEditCell,
      onResizeColumn,
      ...rest,
    });

    return () => {
      canvasTableRef.current!.cleanup();
      canvasTableRef.current = null;
    };
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
    if (elementSize) {
      canvasTableRef.current!.setSize(elementSize);
    }
  }, [elementSize]);

  useUpdateEffect(() => {
    canvasTableRef.current!.config({
      onSelectRow,
      onEditCell,
      onResizeColumn
    });
  }, [onSelectRow, onEditCell, onResizeColumn]);

  return (
    <div
      id={containerIdRef.current}
      className={containerClassName}
      style={containerStyle}
      ref={elementRef}
    />
  );
}

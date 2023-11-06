import { useRef, useLayoutEffect } from "react";
import { CanvasTable, CreateCanvasTableParams } from "@bzrr/canvas-table-core";
import { useElementSize, useUpdateEffect } from "./hooks";

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export type CanvasTableProps = Omit<CreateCanvasTableParams, "container"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
};

export function CanvasTableComponent(props: CanvasTableProps) {
  const {
    columnDefs,
    dataRows,
    theme,
    containerClassName,
    containerStyle,
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

  return (
    <div
      id={containerIdRef.current}
      className={containerClassName}
      style={containerStyle}
      ref={elementRef}
    />
  );
}

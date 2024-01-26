import { useRef, useEffect, useLayoutEffect } from "react";
import { CanvasTable, CanvasTableParams, shallowMatch } from "@bzrr/canvas-table-core";

export type CanvasTableComponentProps = Omit<CanvasTableParams, "container"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
};

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export function CanvasTableComponent(props: CanvasTableComponentProps) {
  const { containerClassName, containerStyle, ...tableProps } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(getContainerId());

  const prevTableProps = usePrevious(tableProps);

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      ...tableProps
    });

    return () => {
      if (canvasTableRef.current) {
        canvasTableRef.current.destroy();
        canvasTableRef.current = null;
      }
    };
  }, []);

  if (prevTableProps && !shallowMatch(tableProps, prevTableProps)) {
    canvasTableRef.current!.config(tableProps);
  }

  return <div id={containerIdRef.current} className={containerClassName} style={containerStyle} />;
}

import { useRef, useLayoutEffect } from "react";
import {
  make_canvas_table,
  config_canvas_table,
  destroy_canvas_table,
  Canvas_Table
} from "@bzrr/canvas-table-core";
import { usePrevious } from "./hooks";
import { shallowMatch } from "./utils";
import { CanvasTableProps } from "./types";

let count = 0;

function getContainerId() {
  const result = `canvas-table-container-${count}`;
  count++;
  return result;
}

export function CanvasTableComponent(props: CanvasTableProps) {
  const { containerClassName, containerStyle, ...tableProps } = props;

  const canvasTableRef = useRef<Canvas_Table | null>(null);
  const containerIdRef = useRef(getContainerId());

  const prevTableProps = usePrevious(tableProps);

  useLayoutEffect(() => {
    canvasTableRef.current = make_canvas_table({
      container: containerIdRef.current,
      ...tableProps
    });

    return () => {
      if (canvasTableRef.current) {
        destroy_canvas_table(canvasTableRef.current);
        canvasTableRef.current = null;
      }
    };
  }, []);

  if (prevTableProps && !shallowMatch(tableProps, prevTableProps)) {
    config_canvas_table(canvasTableRef.current!, tableProps);
  }

  return <div id={containerIdRef.current} className={containerClassName} style={containerStyle} />;
}

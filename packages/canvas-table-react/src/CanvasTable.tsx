import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { CanvasTable, DataRow, DataRowId } from "@bzrr/canvas-table-core";
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
    CellInput,
    onCellInputChange,
    containerClassName,
    containerStyle,
    onSelectRow,
    ...rest
  } = props;

  const canvasTableRef = useRef<CanvasTable | null>(null);
  const containerIdRef = useRef(getContainerId());

  const inputRef = useRef<HTMLInputElement>(null!);

  const [elementSize, elementRef] = useElementSize();

  const [doubleClickedCellInfo, setDoubleClickedCellInfo] = useState<{
    rowIndex: number;
    columnIndex: number;
    key: string;
  }>();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [doubleClickedCellInfo]);

  const handleSelectRow = (id: DataRowId, dataRow: DataRow) => {
    setDoubleClickedCellInfo(undefined);
    onSelectRow?.(id, dataRow);
  }

  const handleDoubleClickCell = (rowIndex: number, columnIndex: number, key: string) => {
    setDoubleClickedCellInfo({ rowIndex, columnIndex, key });
  }

  const handleCellInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      onCellInputChange?.(doubleClickedCellInfo!.key, inputRef.current.value);
      setDoubleClickedCellInfo(undefined);
    } else if (event.key === "Escape") {
      setDoubleClickedCellInfo(undefined);
    }
  }

  const renderInput = () => {
    const { rowIndex, columnIndex } = doubleClickedCellInfo!;
    const cellRect = canvasTableRef.current!.getCellRect(rowIndex, columnIndex);

    const style = {
      position: "absolute",
      left: cellRect.x,
      top: cellRect.y,
      width: cellRect.width,
      height: cellRect.height
    } as React.CSSProperties;

    const props = {
      onKeyDown: handleCellInputKeyDown,
      ref: inputRef,
      style
    };

    if (CellInput) {
      return <CellInput {...props} />
    } else {
      <input {...props} />
    }
  }

  useLayoutEffect(() => {
    canvasTableRef.current = new CanvasTable({
      container: containerIdRef.current,
      columnDefs,
      dataRows,
      theme,
      size: elementSize,
      onSelectRow: handleSelectRow,
      onDoubleClickCell: handleDoubleClickCell,
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
      className={containerClassName}
      style={containerStyle}
      ref={elementRef}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div id={containerIdRef.current} />
        {doubleClickedCellInfo && renderInput()}
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef } from "react";
import { CanvasTable } from "canvas-table";
import { generateTableData } from "./testing/utils/generateTableData";
import { useElementSize } from "./testing/hooks/useElementSize";
import "./Theme.css";
import styles from "./App.module.css";

function App() {
  const rowInputRef = useRef<HTMLInputElement>(null);
  const colInputRef = useRef<HTMLInputElement>(null);
  const selectRef   = useRef<HTMLSelectElement>(null);

  const [containerSize, containerRef] = useElementSize();

  const canvasTableRef = useRef<CanvasTable>();

  useLayoutEffect(() => {
    let canvasTable = canvasTableRef.current as CanvasTable;
    if (!canvasTable) {
      const tableData = generateTableData(100, 100);
      canvasTable = new CanvasTable({
        container: "container",
        columnDefs: tableData.columns,
        dataRows: tableData.data
      });
      canvasTableRef.current = canvasTable;
    }

    canvasTable.setupGlobalEventListeners();
    return () => canvasTable.teardownGlobalEventListeners();
  }, []);

  useEffect(() => {
    const canvasTable = canvasTableRef.current;
    if (canvasTable) {
      canvasTable.resize(containerSize);
    }
  }, [containerSize]);

  const generate = () => {
    const rows = parseInt(rowInputRef.current!.value);
    if (!rows || rows <= 0) {
      return;
    }

    const cols = parseInt(colInputRef.current!.value);
    if (!cols || cols <= 0) {
      return;
    }

    const tableData = generateTableData(rows, cols);
    const canvasTable = canvasTableRef.current as CanvasTable;
    canvasTable.config({
      columnDefs: tableData.columns,
      dataRows: tableData.data
    });
  }

  const onThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    document.body.dataset.theme = event.target.value;

    const container = containerRef.current!;
    const style = getComputedStyle(container);

    const canvasTable = canvasTableRef.current!;
    canvasTable.setTheme({
      fontColor: style.color,
      tableBorderColor: style.borderColor
    });
  }

  return (
    <div className={styles.app}>
      <div style={{ margin: "10px 0" }}>
        <label style={{ marginRight: "10px" }}>Rows:</label>
        <input
          ref={rowInputRef}
          type="text"
          style={{ marginRight: "10px" }}
        />
        <label style={{ marginRight: "10px" }}>Columns:</label>
        <input
          ref={colInputRef}
          type="text"
          style={{ marginRight: "10px" }}
        />
        <button
          onClick={generate}
          style={{ marginRight: "40px" }}
        >
          Generate
        </button>
        <select
          onChange={onThemeChange}
          ref={selectRef}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          </select>
      </div>
      <div id="container" ref={containerRef} className={styles.container} />
    </div>
  );
}

export default App;

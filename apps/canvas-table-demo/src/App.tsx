import { useEffect, useLayoutEffect, useRef } from "react";
import { CanvasTable } from "canvas-table";
import { generateTableData } from "./testing/utils/generateTableData";
import { useElementSize } from "./testing/hooks/useElementSize";
import styles from "./App.module.css";

function App() {
  const rowInputRef = useRef<HTMLInputElement>(null);
  const colInputRef = useRef<HTMLInputElement>(null);

  const [containerSize, containerRef] = useElementSize();

  const konvaTableRef = useRef<CanvasTable>();

  useLayoutEffect(() => {
    (async () => {
      const tableData = generateTableData(100, 100);

      konvaTableRef.current = await CanvasTable.create({
        container: "container",
        columnDefs: tableData.columns,
        dataRows: tableData.data
      });
    })();
  }, []);

  useEffect(() => {
    if (konvaTableRef.current) {
      konvaTableRef.current.setStageDimensions(containerSize);
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
    konvaTableRef.current?.setTableData(tableData.columns, tableData.data);
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
	>
	  Generate
	</button>
      </div>
      <div id="container" ref={containerRef} className={styles.container} />
    </div>
  );
}

export default App;

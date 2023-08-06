import { useEffect, useLayoutEffect, useRef } from "react";
import { KonvaTable } from "./KonvaTable";
import { generateTableData } from "./testing/utils/generateTableData";
import { useElementSize } from "./testing/hooks/useElementSize";
import styles from "./App.module.css";

const [columnDefs, dataRows] = generateTableData(100, 100);

function App() {
  const [containerSize, containerRef] = useElementSize();

  const konvaTableRef = useRef<KonvaTable>();

  useLayoutEffect(() => {
    (async () => {
      konvaTableRef.current = await KonvaTable.create({
        container: "container",
        columnDefs,
        dataRows
      });
    })();
  }, []);

  useEffect(() => {
    if (konvaTableRef.current) {
      konvaTableRef.current.setStageDimensions(containerSize);
    }
  }, [containerSize]);

  return (
    <div className={styles.app}>
      <div id="container" ref={containerRef} className={styles.container} />
    </div>
  );
}

export default App;

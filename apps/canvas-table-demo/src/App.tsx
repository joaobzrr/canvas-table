import { useRef, useState, useEffect } from "react";
import { debounce, isNaN } from "lodash";
import CanvasTable, { Theme } from "canvas-table-react";
import { useElementSize } from "./testing/hooks/useElementSize";
import { generateTableData } from "./testing/utils/generateTableData";
import styles from "./App.module.css";

function App() {
  const [containerSize, containerRef] = useElementSize();

  const [numberOfColumns, setNumberOfColumns] = useState(100);
  const [numberOfRows, setNumberOfRows] = useState(100);
  const [charset, setCharset] = useState("abcdefghijklmnopqrstuvwxyz世界中で深刻な関心を引き起こしています");

  const [data, setData] = useState(() => {
    return generateTableData(numberOfColumns, numberOfRows, charset);
  });
    
  const [theme, setTheme] = useState<Partial<Theme>>();

  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    
    const data = generateTableData(numberOfColumns, numberOfRows, charset);
    setData(data);
  }, [numberOfColumns, numberOfRows]);

  const updateNumberOfColumns = debounce((value: string) => {
    const numberOfColumns = parseInt(value);
    if (isNaN(numberOfColumns)) {
      return;
    }

    if (numberOfColumns < 0 || numberOfColumns > 100) {
      return;
    }

    setNumberOfColumns(numberOfColumns);
  }, 250);

  const updateNumberOfRows = debounce((value: string) => {
    const numberOfRows = parseInt(value);
    if (isNaN(numberOfRows)) {
      return;
    }

    if (numberOfRows < 0 || numberOfRows > 100) {
      return;
    }

    setNumberOfRows(numberOfRows);
  }, 250);

  const updateCharset = debounce((value: string) => {
    setCharset(value);

    const data = generateTableData(numberOfColumns, numberOfRows, value);
    setData(data);
  }, 250);

  const updateTheme = debounce((theme: Partial<Theme>) => {
    setTheme(prevTheme => ({ ...prevTheme, ...theme }));
  }, 250);
  
  return (
    <div className={styles.app}>
      <div className={styles.sidebar}>
        <form>
          <div className={styles.row}>
            <label className={styles.label}>Rows</label>
            <input
              onChange={event => updateNumberOfColumns(event.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Columns</label>
            <input
              onChange={event => updateNumberOfRows(event.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Charset</label>
            <input
              onChange={event => updateCharset(event.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Font Family</label>
            <input
              onChange={event => updateTheme({
                fontFamily: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Font Size</label>
            <input
              onChange={event => updateTheme({
                fontSize: parseInt(event.target.value) || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Font Color</label>
            <input
              onChange={event => updateTheme({
                fontColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Border Color</label>
            <input
              onChange={event => updateTheme({
                tableBorderColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Thickness</label>
            <input
              onChange={event => updateTheme({
                scrollBarThickness: parseInt(event.target.value) || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Track Margin</label>
            <input
              onChange={event => updateTheme({
                scrollBarTrackMargin: parseInt(event.target.value) || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Thumb Color</label>
            <input
              onChange={event => updateTheme({
                scrollBarThumbColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Scrollbar Track Color</label>
            <input
              onChange={event => updateTheme({
                scrollBarTrackColor: event.target.value || undefined
              })}
              className={styles.input}
            />
          </div>
        </form>
      </div>
      <main className={styles.main}>
        <CanvasTable
          size={containerSize}
          theme={theme}
          containerClassName={styles["canvas-table"]}
          ref={containerRef}
          {...data}
          {...containerSize}
        />
      </main>
    </div>
  );
}

export default App;

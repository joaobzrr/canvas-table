import { useLayoutEffect, useRef, useState } from "react";
import { debounce } from "lodash";
import { CanvasTable } from "@bzrr/canvas-table-react";
import {
  defaultTheme,
  DataRow,
  Theme,
  DataRowId,
  PropValue,
} from "@bzrr/canvas-table-core";
import ThemeForm from "./components/ThemeForm";
import TableList from "./components/TableList";
import Tabs from "./components/Tabs";
import { tables } from "./tables";
import { shallowMerge } from "./utils";
import styles from "./App.module.css";
import { Table } from "./types";

function App() {
  const [table, setTable] = useState<Table>(tables[0]);

  const [themeSettings, setThemeSettings] = useState<Partial<Theme>>({});
  const theme = shallowMerge({}, defaultTheme, themeSettings);

  const [selectedTab, setSelectedTab] = useState<React.Key>("tables");

  const [selectedRow, setSelectedRow] = useState<DataRow>();

  const [cellRect, setCellRect] = useState<Record<string, any> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null!);

  const updateTheme = debounce((partial: Partial<Theme>) => {
    setThemeSettings((prevThemeSettings) => ({
      ...prevThemeSettings,
      ...partial,
    }));
  }, 250);

  const onTableChange = (id: string) => {
    const table = tables.find((table) => table.id === id);
    if (!table) {
      throw new Error(`Table with id "${id}" could not be found`);
    }
    setTable(table);
  };

  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [cellRect]);

  return (
    <div className={styles.app}>
      <div className={styles.leftSidebar}>
        <Tabs
          items={[
            {
              key: "tables",
              label: "Tables",
            },
            {
              key: "theme",
              label: "Theme",
            },
          ]}
          selected={selectedTab}
          onTabClick={(key) => setSelectedTab(key)}
        />
        {selectedTab === "tables" ? (
          <TableList
            value={table.id}
            tables={tables}
            onChange={onTableChange}
          />
        ) : (
          <ThemeForm style={{ flex: 1 }} onChange={updateTheme} />
        )}
      </div>
      <main className={styles.main}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            height: "100%"
          }}
        >
          <CanvasTable
            columnDefs={table.columnDefs}
            dataRows={table.dataRows}
            theme={theme}
            containerClassName={styles.canvasTable}
            selectId={(row) => row.id as DataRowId}
            onSelectRow={(_, row) => setSelectedRow(row)}
            onDoubleClickCell={(_, __, rect) => setCellRect(rect)}
          />
          {cellRect && (
            <input
              ref={inputRef}
              style={{
                pointerEvents: "auto",
                position: "absolute",
                left: cellRect.x,
                top: cellRect.y,
                width: cellRect.width,
                height: cellRect.height,
              }}
            />
          )}
        </div>
      </main>
      <div className={styles.rightSidebar}>
        {selectedRow && (
          <form>
            {table.columnDefs.map(({ title, key }) => (
              <div className={styles.row} key={key}>
                <label className={styles.label}>{title}</label>
                <input
                  value={selectedRow[key] as PropValue}
                  className={styles.input}
                  disabled={true}
                />
              </div>
            ))}
          </form>
        )}
      </div>
    </div>
  );
}

export default App;

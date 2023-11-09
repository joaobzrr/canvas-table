import { useLayoutEffect, useRef, useState } from "react";
import { debounce } from "lodash";
import { CanvasTable } from "@bzrr/canvas-table-react";
import {
  defaultTheme,
  DataRow,
  Theme,
  DataRowId,
  PropValue,
  Rect,
} from "@bzrr/canvas-table-core";
import ThemeForm from "./components/ThemeForm";
import TableList from "./components/TableList";
import Tabs from "./components/Tabs";
import CellInput from "./components/CellInput";
import { tables as allTables } from "./tables";
import { shallowMerge } from "./utils";
import { Table } from "./types";
import styles from "./App.module.css";

function App() {
  const [tables, setTables] = useState<Table[]>(allTables);
  const [selectedTableId, setSelectedTableId] = useState(tables[0].id);

  const tableIndex = tables.findIndex((table) => table.id === selectedTableId);
  if (tableIndex === -1) {
    throw new Error("This should not happen");
  }

  const table = tables[tableIndex];

  const [themeSettings, setThemeSettings] = useState<Partial<Theme>>();
  const theme = shallowMerge({}, defaultTheme, themeSettings);

  const [selectedTab, setSelectedTab] = useState<React.Key>("tables");

  const [selectedRow, setSelectedRow] = useState<DataRow>();

  const [selectedKey, setSelectedKey] = useState<string>();

  const inputRef = useRef<HTMLInputElement>(null!);

  const [cellRect, setCellRect] = useState<Rect>();

  const onEdit = (key: string, value: string) => {
    if (!selectedRow) {
      return;
    }

    const rowIndex = table.dataRows.findIndex(
      ({ id }) => id === selectedRow.id,
    );
    if (rowIndex === -1) {
      throw new Error("This should not happen");
    }

    const newRow = { ...selectedRow, [key]: value };
    setSelectedRow(newRow);

    const newTable = {
      ...table,
      dataRows: [
        ...table.dataRows.slice(0, rowIndex),
        newRow,
        ...table.dataRows.slice(rowIndex + 1),
      ],
    };

    setTables([
      ...tables.slice(0, tableIndex),
      newTable,
      ...tables.slice(tableIndex + 1),
    ]);
  };

  const updateTheme = debounce((partial: Partial<Theme>) => {
    setThemeSettings((prevThemeSettings) => ({
      ...prevThemeSettings,
      ...partial,
    }));
  }, 250);

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
            onChange={setSelectedTableId}
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
            height: "100%",
          }}
        >
          <CanvasTable
            columnDefs={table.columnDefs}
            dataRows={table.dataRows}
            theme={theme}
            containerClassName={styles.canvasTable}
            selectId={(row) => row.id as DataRowId}
            onSelectRow={(_, row) => {
              setSelectedRow(row);
              setCellRect(undefined);
            }}
            onDoubleClickCell={(_, key, rect) => {
              setCellRect(rect);
              setSelectedKey(key);
            }}
          />
          {cellRect && (
            <CellInput
              initialValue={selectedRow![selectedKey!] as string}
              ref={inputRef}
              style={{
                left: cellRect.x,
                top: cellRect.y,
                width: cellRect.width,
                height: cellRect.height,
                fontFamily: theme.fontFamily,
                fontSize: theme.fontSize,
                color: theme.fontColor,
                paddingLeft: theme.cellPadding,
                paddingRight: theme.cellPadding,
                outline: "none",
                border: "none",
              }}
              onSubmit={(value) => {
                setCellRect(undefined);
                onEdit(selectedKey!, value);
              }}
              onCancel={() => setCellRect(undefined)}
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
                  onChange={(e) => onEdit(key, e.target.value)}
                  className={styles.input}
                  disabled={!selectedRow}
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

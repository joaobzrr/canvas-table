import { useState, useMemo } from 'react';
import { debounce } from 'lodash';
import {
  CanvasTable,
  defaultTheme,
  type DataRow,
  type Theme,
  type DataRowId,
  type PropValue,
} from '@bzrr/canvas-table-react';
import { ThemeForm } from './components/ThemeForm';
import { TableList } from './components/TableList';
import { Tabs } from './components/Tabs';
import { tables as allTables } from './tables';
import { shallowMerge } from './utils';
import type { Table } from './types';
import styles from './App.module.css';

const batchedColumnWidthChanges = new Map<string, number>();

export const App = () => {
  const [tables, setTables] = useState<Table[]>(allTables);
  const [selectedTableId, setSelectedTableId] = useState(tables[0].id);

  const tableIndex = tables.findIndex((table) => table.id === selectedTableId);
  if (tableIndex === -1) {
    throw new Error('This should not happen');
  }

  const table = tables[tableIndex];

  const [themeSettings, setThemeSettings] = useState<Partial<Theme>>({
    outerBorderWidth: 0,
    //    bodyBackgroundColor: 'lightgreen',
    //    headBackgroundColor: 'tomato',
    //    headBorderWidth: 0,
  });

  const theme = useMemo(() => {
    return shallowMerge<Theme>({}, defaultTheme, themeSettings);
  }, [themeSettings]);

  const [selectedTab, setSelectedTab] = useState<React.Key>('tables');

  const [selectedRow, setSelectedRow] = useState<DataRow>();

  const onEdit = (key: string, value: string) => {
    if (!selectedRow) {
      return;
    }

    const rowIndex = table.dataRows.findIndex(({ id }) => id === selectedRow.id);
    if (rowIndex === -1) {
      throw new Error('This should not happen');
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

    setTables([...tables.slice(0, tableIndex), newTable, ...tables.slice(tableIndex + 1)]);
  };

  const onResizeColumn = (columnKey: string, _: number, columnWidth: number) => {
    const key = selectedTableId + ',' + columnKey;
    batchedColumnWidthChanges.set(key, columnWidth);
    updateTableColumnWidths();
  };

  const updateTableColumnWidths = debounce(() => {
    let newTables = tables;

    for (const [key, width] of batchedColumnWidthChanges) {
      const [tableId, columnKey] = key.split(',');

      const tableIndex = newTables.findIndex((table) => table.id === tableId);
      if (tableIndex === -1) {
        throw new Error('This should not happen');
      }
      const table = newTables[tableIndex];

      const columnDefIndex = table.columnDefs.findIndex((columnDef) => columnDef.key === columnKey);
      if (columnDefIndex === -1) {
        throw new Error('This should not happen');
      }
      const columnDef = table.columnDefs[columnDefIndex];

      const newColumnDef = { ...columnDef, width: width };
      const newColumnDefs = [
        ...table.columnDefs.slice(0, columnDefIndex),
        newColumnDef,
        ...table.columnDefs.slice(columnDefIndex + 1),
      ];

      const newTable = { ...table, columnDefs: newColumnDefs };
      newTables = [...newTables.slice(0, tableIndex), newTable, ...newTables.slice(tableIndex + 1)];
    }

    batchedColumnWidthChanges.clear();

    setTables(newTables);
  }, 1000);

  const updateTheme = debounce((partial: Partial<Theme>) => {
    setThemeSettings((prevThemeSettings) => ({
      ...prevThemeSettings,
      ...partial,
    }));
  }, 100);

  return (
    <div className={styles.app}>
      <div className={styles.leftSidebar}>
        <Tabs
          items={[
            {
              key: 'tables',
              label: 'Tables',
            },
            {
              key: 'theme',
              label: 'Theme',
            },
          ]}
          selected={selectedTab}
          onTabClick={(key) => setSelectedTab(key)}
        />
        {selectedTab === 'tables' ? (
          <TableList
            value={table.id}
            tables={tables}
            onChange={setSelectedTableId}
          />
        ) : (
          <ThemeForm
            style={{ flex: 1 }}
            onChange={updateTheme}
          />
        )}
      </div>
      <main className={styles.main}>
        <div style={{ height: '100%', border: '1px solid red' }}>
          <CanvasTable
            columnDefs={table.columnDefs}
            dataRows={table.dataRows}
            theme={theme}
            selectedRowId={selectedRow?.id as DataRowId}
            containerClassName={styles.canvasTable}
            selectId={(row) => row.id as DataRowId}
            onSelectRow={(_, row) => setSelectedRow(row)}
            onResizeColumn={onResizeColumn}
          />
        </div>
      </main>
      <div className={styles.rightSidebar}>
        {selectedRow && (
          <form>
            {table.columnDefs.map(({ title, key }) => (
              <div
                className={styles.row}
                key={key}
              >
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
};

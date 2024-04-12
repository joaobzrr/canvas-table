# Canvas Table

High performance table component made with Canvas.

## Installation

```
# npm
npm install @bzrr/canvas-table-react
npm install @bzrr/canvas-table-solid

# pnpm
pnpm install @bzrr/canvas-table-react
pnpm install @bzrr/canvas-table-solid
```

## Usage

```tsx
import { CanvasTable, type ColumnDef, type DataRow } from "@bzrr/canvas-table-react";

export function App() {
  const columnDefs: ColumnDef[] = [
    {
      title: "First Name",
      key: "firstName"
    },
    {
      title: "Last Name",
      key: "lastName"
    },
    {
      title: "Age",
      key: "age"
    }
  ];

  const dataRows: DataRow[] = [
    {
      id: 1,
      firstName: "Curtis",
      lastName: "Bates",
      age: 10
    },
    {
      id: 2,
      firstName: "Ellie",
      lastName: "Massey",
      age: 23
    }
  ];

  return (
    <div className="App">
      <CanvasTable
        columnDefs={columnDefs}
        dataRows={dataRows}
      />
    </div>
  );
}
```

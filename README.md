# Canvas Table

High performance table component made with Canvas.

## Installation

```
# npm
pnpm install @bzrr/canvas-table-core @bzrr/canvas-table-react

# pnpm
pnpm install @bzrr/canvas-table-core @bzrr/canvas-table-react
```

## Usage

```tsx
import React from "react";
import { CanvasTable } from "@bzrr/canvas-table-react";
import { ColumnDef, DataRow } from "@bzrr/canvas-table-core";

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

import { CanvasTable } from "../../CanvasTable";

export class CellInput {
  ct: CanvasTable;
  input: HTMLInputElement;

  constructor(ct: CanvasTable) {
    this.ct = ct;

    this.input = document.createElement("input");
    this.input.style.position = "absolute";
    this.input.style.border = "none";
    this.input.style.outline = "none";
    this.input.style.pointerEvents = "auto";

    this.input.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  show(rowIndex: number, columnIndex: number) {
    const {
      stage: { bodyEl },
      layout,
      columnStates,
      dataRows,
      theme: { rowHeight }
    } = this.ct;

    bodyEl.appendChild(this.input);

    const columnState = columnStates[columnIndex];
    this.input.style.width = cssPixelValue(columnState.width - 1);

    const dataRow = dataRows[rowIndex];
    const value = dataRow[columnState.key] as string;
    this.input.value = value;

    const screenColPosition = layout.getScreenColPos(columnIndex);
    const screenRowPosition = layout.getScreenRowPos(rowIndex);
    this.input.style.left = cssPixelValue(screenColPosition);
    this.input.style.top = cssPixelValue(screenRowPosition - rowHeight);

    this.input.focus();
    this.input.scrollLeft = this.input.scrollWidth;
  }

  onScroll() {
    const { layout, theme, selectedColumnIndex, selectedRowIndex } = this.ct;
    const screenColumnPosition = layout.getScreenColPos(selectedColumnIndex);
    const screenRowPosition = layout.getScreenRowPos(selectedRowIndex);
    const x = screenColumnPosition;
    const y = screenRowPosition - theme.rowHeight;
    this.input.style.left = cssPixelValue(x);
    this.input.style.top = cssPixelValue(y);
  }

  onResizeColumn(columnIndex: number) {
    const { columnStates, selectedColumnIndex } = this.ct;
    if (columnIndex === selectedColumnIndex) {
      const columnState = columnStates[columnIndex];
      this.input.style.width = cssPixelValue(columnState.width - 1);
    }
  }

  onThemeChanged() {
    const { rowHeight, cellPadding, selectedRowColor, fontFamily, fontSize } = this.ct.theme;

    this.input.style.height = cssPixelValue(rowHeight - 1);
    this.input.style.paddingLeft = cssPixelValue(cellPadding - 1);
    this.input.style.paddingRight = cssPixelValue(cellPadding);
    this.input.style.backgroundColor = selectedRowColor;
    this.input.style.fontFamily = fontFamily;
    this.input.style.fontSize = fontSize;
  }

  onKeyDown(event: KeyboardEvent) {
    const { columnStates, selectedColumnIndex, onEditCell } = this.ct;

    if (event.key === "Enter") {
      const columnState = columnStates[selectedColumnIndex];
      onEditCell?.(columnState.key, this.input.value);
      this.input.remove();
    } else if (event.key === "Escape") {
      this.input.remove();
    }
  }
}

function cssPixelValue(num: number) {
  return num + "px";
}

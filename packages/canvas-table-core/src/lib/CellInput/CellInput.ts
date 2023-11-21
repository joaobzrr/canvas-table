import { Theme } from "../..";
import { BORDER_WIDTH, SELECTED_CELL_BORDER_WIDTH } from "../../constants";
import { Layout } from "../Layout";
import { TableContext } from "../TableContext";

export class CellInput {
  tblctx: TableContext;

  containerEl: HTMLDivElement;
  inputEl: HTMLInputElement;

  constructor(tblctx: TableContext) {
    this.tblctx = tblctx;
    this.tblctx.on("reflow", this.onReflow.bind(this));
    this.tblctx.on("dblclickcell", this.onDoubleClickCell.bind(this));
    this.tblctx.on("selrowchange", this.onSelectedRowChange.bind(this));
    this.tblctx.on("themechange", this.onThemeChange.bind(this));

    const { relativeEl } = this.tblctx.stage;
    this.containerEl = document.createElement("div");
    this.containerEl.style.position = "absolute";
    this.containerEl.style.overflow = "hidden";
    this.containerEl.style.pointerEvents = "none";
    relativeEl.appendChild(this.containerEl);

    this.inputEl = document.createElement("input");
    this.inputEl.style.position = "absolute";
    this.inputEl.style.border = "none";
    this.inputEl.style.outline = "none";
    this.inputEl.style.pointerEvents = "auto";
    this.updateInputFromTheme(this.tblctx.props.theme);

    this.inputEl.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  onDoubleClickCell(rowIndex: number, colIndex: number) {
    const { props } = this.tblctx;

    if (!this.inputEl.parentNode) {
      this.containerEl.appendChild(this.inputEl);
    }

    const columnDef = props.columnDefs[colIndex];
    const dataRow = props.dataRows[rowIndex];
    const value = props.selectProp(dataRow, columnDef.key) as string;
    this.inputEl.value = value;

    this.inputEl.focus();
    this.inputEl.scrollLeft = this.inputEl.scrollWidth;

    this.updateFromLayout(this.tblctx.layout);
  }

  onReflow(layout: Layout) {
    this.updateFromLayout(layout);
  }

  onSelectedRowChange() {
    if (this.inputEl.parentNode) {
      this.inputEl.remove();
    }
  }

  onThemeChange(theme: Theme) {
    this.updateInputFromTheme(theme);
  }

  onKeyDown(event: KeyboardEvent) {
    const { columnDefs, onEditCell } = this.tblctx.props;
    const { selectedColIndex } = this.tblctx.state;

    if (event.key === "Enter") {
      const columnDef = columnDefs[selectedColIndex];
      onEditCell?.(columnDef.key, this.inputEl.value);
      this.remove();
    } else if (event.key === "Escape") {
      this.remove();
    }
  }

  remove() {
    this.tblctx.state.selectedColIndex = -1;
    this.inputEl.remove();
  }

  updateFromLayout(layout: Layout) {
    this.updateContainerFromLayout(layout);
    this.updateInputFromLayout(layout);
  }

  updateContainerFromLayout(layout: Layout) {
    const { theme } = this.tblctx.props;

    const left = BORDER_WIDTH;
    const top = theme.rowHeight + BORDER_WIDTH;
    const width = layout.bodyAreaWidth - BORDER_WIDTH;
    const height = layout.bodyAreaHeight - BORDER_WIDTH;

    this.containerEl.style.left = cssPixelValue(left);
    this.containerEl.style.top = cssPixelValue(top);
    this.containerEl.style.width = cssPixelValue(width);
    this.containerEl.style.height = cssPixelValue(height);
  }

  updateInputFromLayout(layout: Layout) {
    const { columnWidths, selectedColIndex, selectedRowIndex } = this.tblctx.state;
    const { theme } = this.tblctx.props;

    const screenColumnPosition = layout.getScreenColPos(selectedColIndex);
    const screenRowPosition = layout.getScreenRowPos(selectedRowIndex);

    const x = screenColumnPosition + SELECTED_CELL_BORDER_WIDTH - BORDER_WIDTH;
    const y = screenRowPosition - theme.rowHeight + SELECTED_CELL_BORDER_WIDTH - BORDER_WIDTH;
    this.inputEl.style.left = cssPixelValue(x);
    this.inputEl.style.top = cssPixelValue(y);

    const columnWidth = columnWidths[selectedColIndex];
    const width = columnWidth - SELECTED_CELL_BORDER_WIDTH * 2 + BORDER_WIDTH;

    this.inputEl.style.width = cssPixelValue(width);
  }

  updateInputFromTheme(theme: Theme) {
    const height = theme.rowHeight - SELECTED_CELL_BORDER_WIDTH * 2 + BORDER_WIDTH;
    this.inputEl.style.height = cssPixelValue(height);

    if (theme.selectedCellBackgroundColor) {
      this.inputEl.style.backgroundColor = theme.selectedCellBackgroundColor;
    }

    this.inputEl.style.paddingLeft = cssPixelValue(theme.cellPadding);
    this.inputEl.style.paddingRight = cssPixelValue(theme.cellPadding);
    this.inputEl.style.fontFamily = theme.fontFamily;
    this.inputEl.style.fontSize = theme.fontSize;
  }
}

function cssPixelValue(num: number) {
  return num + "px";
}

import { Theme } from "../..";
import { BORDER_WIDTH, SELECTED_CELL_BORDER_WIDTH } from "../../constants";
import { Layout } from "../Layout";
import { TableContext } from "../TableContext";

export class CellInput {
  tblctx: TableContext;

  viewportEl: HTMLDivElement;
  contentEl: HTMLDivElement;
  inputEl: HTMLInputElement;

  constructor(tblctx: TableContext) {
    this.tblctx = tblctx;
    this.tblctx.on("reflow", this.onReflow.bind(this));
    this.tblctx.on("dblclickcell", this.onDoubleClickCell.bind(this));
    this.tblctx.on("selrowchange", this.onSelectedRowChange.bind(this));
    this.tblctx.on("themechange", this.onThemeChange.bind(this));

    const { relativeEl } = this.tblctx.stage;
    this.viewportEl = document.createElement("div");
    this.viewportEl.style.position = "absolute";
    this.viewportEl.style.overflow = "hidden";
    this.viewportEl.style.pointerEvents = "none";
    this.viewportEl.addEventListener("scroll", this.onViewportScroll.bind(this));
    relativeEl.appendChild(this.viewportEl);

    this.contentEl = document.createElement("div");
    this.contentEl.style.position = "absolute";
    this.viewportEl.appendChild(this.contentEl);

    this.inputEl = document.createElement("input");
    this.inputEl.style.position = "absolute";
    this.inputEl.style.border = "none";
    this.inputEl.style.outline = "none";
    this.inputEl.style.pointerEvents = "auto";
    this.updateInputFromTheme(this.tblctx.props.theme);

    this.inputEl.addEventListener("keydown", this.onInputKeyDown.bind(this));
  }

  onDoubleClickCell(rowIndex: number, colIndex: number) {
    const { props } = this.tblctx;

    if (!this.inputEl.parentNode) {
      this.contentEl.appendChild(this.inputEl);
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

  onInputKeyDown(event: KeyboardEvent) {
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

  onViewportScroll() {
    const { layout } = this.tblctx;
    const { scrollLeft, scrollTop } = this.viewportEl;

    layout.scrollTo(scrollLeft, scrollTop);
  }

  remove() {
    this.tblctx.state.selectedColIndex = -1;
    this.inputEl.remove();
  }

  updateFromLayout(layout: Layout) {
    this.updateViewportFromLayout(layout);
    this.updateContentFromLayout(layout);
    this.updateInputFromLayout(layout);
  }

  updateViewportFromLayout(layout: Layout) {
    const { theme } = this.tblctx.props;

    const left = BORDER_WIDTH;
    const top = theme.rowHeight + BORDER_WIDTH;
    const width = layout.bodyAreaWidth - BORDER_WIDTH;
    const height = layout.bodyAreaHeight - BORDER_WIDTH;

    this.viewportEl.style.left = cssPixelValue(left);
    this.viewportEl.style.top = cssPixelValue(top);
    this.viewportEl.style.width = cssPixelValue(width);
    this.viewportEl.style.height = cssPixelValue(height);

    this.viewportEl.scrollLeft = layout.scrollX;
    this.viewportEl.scrollTop = layout.scrollY;
  }

  updateContentFromLayout(layout: Layout) {
    this.contentEl.style.width = cssPixelValue(layout.actualBodyWidth);
    this.contentEl.style.height = cssPixelValue(layout.actualBodyHeight);
  }

  updateInputFromLayout(layout: Layout) {
    const { columnWidths, selectedColIndex, selectedRowIndex } = this.tblctx.state;
    const { theme } = this.tblctx.props;

    const canonicalColumnPosition = layout.getCanonicalColPos(selectedColIndex);
    const canonicalRowPosition = layout.getCanonicalRowPos(selectedRowIndex) + theme.rowHeight;

    const x = canonicalColumnPosition + SELECTED_CELL_BORDER_WIDTH - BORDER_WIDTH;
    const y = canonicalRowPosition - theme.rowHeight + SELECTED_CELL_BORDER_WIDTH - BORDER_WIDTH;
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

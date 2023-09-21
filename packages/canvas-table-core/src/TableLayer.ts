import Konva from "konva";
import { CanvasTable } from "./CanvasTable";
import { TextRenderer } from "./TextRenderer";
import { LineRenderer } from "./LineRenderer";
import { ReflowEvent, ThemeChangedEvent } from "./events";
import { Font } from "./types";

export class TableLayer {
  private ct: CanvasTable;

  private layer: Konva.Layer;
  private image: Konva.Image;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private textRenderer: TextRenderer;
  private lineRenderer: LineRenderer;

  private bodyFont: Font;
  private headFont: Font;

  private mainAreaClipRegion: Path2D;
  private bodyAreaClipRegion: Path2D;

  constructor(ct: CanvasTable) {
    this.ct = ct;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;

    this.ct.addEventListener("reflow", this.onReflow.bind(this));
    this.ct.addEventListener("themeChanged", this.onThemeChanged.bind(this));
    this.ct.addEventListener("scroll", this.onScroll.bind(this));

    this.layer = new Konva.Layer({
      imageSmoothingEnabled: false,
      listening: false
    });

    this.image = new Konva.Image({ image: this.canvas });
    this.layer.add(this.image);

    this.textRenderer = new TextRenderer();
    this.lineRenderer = new LineRenderer();

    const { mainArea, bodyArea } = this.ct.getTableState();

    this.mainAreaClipRegion = new Path2D();
    this.mainAreaClipRegion.rect(0, 0, mainArea.width, mainArea.height);

    this.bodyAreaClipRegion = new Path2D();
    this.bodyAreaClipRegion.rect(0, 0, bodyArea.width, bodyArea.height);

    const { fontFamily, fontSize, fontColor } = this.ct.getTheme();

    this.bodyFont = {
      family: fontFamily,
      size: fontSize,
      color: fontColor,
      style: "normal"
    };

    this.headFont = {
      family: fontFamily,
      size: fontSize,
      color: fontColor,
      style: "bold"
    };
  }
  
  public getLayer() {
    return this.layer;
  }

  public getImage() {
    return this.image;
  }

  private onReflow(event: Event) {
    const { size } = (event as ReflowEvent).detail;

    this.canvas.width  = size.width;
    this.canvas.height = size.height;

    this.reflow();
    this.render();
  }

  private onThemeChanged(event: Event) {
    const { theme } = (event as ThemeChangedEvent).detail;
    const { fontFamily, fontSize, fontColor, tableBorderColor } = theme;

    this.bodyFont = {
      family: fontFamily,
      size: fontSize,
      color: fontColor,
      style: "normal"
    };

    this.headFont = {
      family: fontFamily,
      size: fontSize,
      color: fontColor,
      style: "bold" 
    };

    this.textRenderer.clearAtlas();
    this.lineRenderer.setColor(tableBorderColor);

    this.reflow();
    this.render();
  }

  private onScroll(_event: Event) {
    this.render();
  }

  private reflow() {
    const { mainArea, bodyArea } = this.ct.getTableState();

    this.mainAreaClipRegion = new Path2D();
    this.mainAreaClipRegion.rect(
      mainArea.x, mainArea.y, mainArea.width, mainArea.height);

    this.bodyAreaClipRegion = new Path2D();
    this.bodyAreaClipRegion.rect(
      bodyArea.x, bodyArea.y, bodyArea.width, bodyArea.height);
  }

  private render() {
    this.clearCanvas();
    this.renderScrollbarBackground();
    this.renderLines();
    this.renderText();

    this.image.setAttr("image", this.canvas);
  }

  private renderText() {
    const {
      columnStates,
      dataRows,
      scrollPos,
      tableRanges
    } = this.ct.getTableState();

    const { rowHeight, cellPadding } = this.ct.getTheme();

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;

    this.ctx.save();
    this.ctx.clip(this.mainAreaClipRegion);

    const offsetX = -scrollPos.x + cellPadding;
    const offsetY = -scrollPos.y + rowHeight / 2 + rowHeight;

    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = columnStates[j];
      const { pos, width, title: text } = columnState;

      const x = pos + offsetX;
      const y = rowHeight / 2;
      const maxWidth = width - cellPadding * 2;

      this.textRenderer.render(this.ctx, this.headFont, text, x, y, maxWidth, true);
    }

    this.ctx.clip(this.bodyAreaClipRegion);

    for (let i = rowTop; i < rowBottom; i++) {
      const dataRow = dataRows[i];
      const y = i * rowHeight + offsetY;

      for (let j = columnLeft; j < columnRight; j++) {
        const columnState = columnStates[j];
        const { pos, width, field } = columnState;

        const x = pos + offsetX;
        const maxWidth = width - cellPadding * 2;
        const text = dataRow[field];

        this.textRenderer.render(this.ctx, this.bodyFont, text, x, y, maxWidth, true);
      }
    }

    this.ctx.restore();
  }

  private renderLines() {
    const {
      columnStates,
      mainArea,
      hsbArea,
      vsbArea,
      scrollPos,
      tableSize,
      tableRanges,
      overflow
    } = this.ct.getTableState();

    const { rowHeight } = this.ct.getTheme();

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;

    this.ctx.save();
    this.ctx.lineWidth = 1;

    // Draw grid horizontal lines
    const gridWidth = Math.min(mainArea.width, tableSize.width);
    for (let i = rowTop + 1; i < rowBottom; i++) {
      const y = i * rowHeight + rowHeight - scrollPos.y;
      this.lineRenderer.hline(this.ctx, 0, y, gridWidth);
    }

    // Draw grid vertical lines
    const gridHeight = Math.min(mainArea.height, tableSize.height + rowHeight);
    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = columnStates[j];
      const x = columnState.pos - scrollPos.x;
      this.lineRenderer.vline(this.ctx, x, 0, gridHeight);
    }

    // Draw header bottom border
    this.lineRenderer.hline(this.ctx, 0, rowHeight, mainArea.width);

    if (overflow.x) {
      this.lineRenderer.hline(this.ctx, hsbArea.x, hsbArea.y, hsbArea.width);
      this.lineRenderer.vline(this.ctx, hsbArea.width, hsbArea.y, hsbArea.height);
    } else {
      this.lineRenderer.vline(this.ctx, tableSize.width, 0, gridHeight);
    }

    if (overflow.y) {
      this.lineRenderer.vline(this.ctx, mainArea.width, 0, mainArea.height);
      this.lineRenderer.hline(this.ctx, vsbArea.x, vsbArea.y, vsbArea.width);
      this.lineRenderer.hline(this.ctx, vsbArea.x, vsbArea.y + vsbArea.height, vsbArea.width);
    } else {
      this.lineRenderer.hline(this.ctx, 0, gridHeight, tableSize.width);
    }

    this.ctx.restore();
  }

  private renderScrollbarBackground() {
    const { hsbArea, vsbArea, overflow } = this.ct.getTableState();
    const { scrollBarTrackColor } = this.ct.getTheme();

    if (!scrollBarTrackColor) {
      return;
    }

    this.ctx.save();
    this.ctx.fillStyle = scrollBarTrackColor!;

    if (overflow.x) {
      this.ctx.fillRect(hsbArea.x, hsbArea.y, hsbArea.width, hsbArea.height);
    }

    if (overflow.y) {
      this.ctx.fillRect(vsbArea.x, vsbArea.y, vsbArea.width, vsbArea.height);
    }

    this.ctx.restore();
  }

  private clearCanvas() {
    const { tableBackgroundColor } = this.ct.getTheme();
    if (tableBackgroundColor) {
      this.ctx.save();
      this.ctx.fillStyle = tableBackgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

import Konva from "konva";
import { CanvasTable } from "./CanvasTable";
import { TextRenderer } from "./TextRenderer";
import { LineRenderer } from "./LineRenderer";
import { ReflowEvent, ThemeChangedEvent } from "./events";
import { BORDER_WIDTH } from "./constants";
import { Font, Size } from "./types";

export class BackgroundLayer {
  private ct: CanvasTable;

  private layer: Konva.Layer;
  private image: Konva.Image;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private textRenderer: TextRenderer;
  private lineRenderer: LineRenderer;

  private bodyFont: Font;
  private headerFont: Font;

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

    const { bodyFont, headerFont } = this.makeFonts();
    this.bodyFont   = bodyFont;
    this.headerFont = headerFont;

    const { mainAreaClipRegion, bodyAreaClipRegion } = this.makeClipRegions();
    this.mainAreaClipRegion = mainAreaClipRegion;
    this.bodyAreaClipRegion = bodyAreaClipRegion;
  }

  public getLayer() {
    return this.layer;
  }

  public getImage() {
    return this.image;
  }

  private onReflow(event: Event) {
    const { size } = (event as ReflowEvent).detail;

    this.resizeCanvas(size);
    this.reflow();
    this.render();
  }

  private onThemeChanged(event: Event) {
    const { theme } = (event as ThemeChangedEvent).detail;
    const { tableBorderColor } = theme;

    const { bodyFont, headerFont } = this.makeFonts();
    this.bodyFont   = bodyFont;
    this.headerFont = headerFont;

    this.textRenderer.clearAtlas();
    this.lineRenderer.setColor(tableBorderColor);

    this.reflow();
    this.render();
  }

  private onScroll() {
    this.render();
  }

  private reflow() {
    const { mainAreaClipRegion, bodyAreaClipRegion } = this.makeClipRegions();
    this.mainAreaClipRegion = mainAreaClipRegion;
    this.bodyAreaClipRegion = bodyAreaClipRegion;
  }

  private render() {
    const {
      columnStates,
      dataRows,
      scrollPos,
      contentSize,
      mainArea,
      bodyArea,
      headerArea,
      hsbOuterArea,
      vsbOuterArea,
      overflow,
      tableRanges
    } = this.ct.getState();

    const {
      rowHeight,
      cellPadding,
      tableBackgroundColor,
      bodyBackgroundColor,
      headerBackgroundColor,
      scrollbarTrackColor
    } = this.ct.getTheme();

    this.ctx.save();

    // Fill or clear table background
    if (tableBackgroundColor) {
      this.ctx.fillStyle = tableBackgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Fill body and header background
    const bbc = bodyBackgroundColor ?? tableBackgroundColor;
    if (bbc) {
      this.ctx.fillStyle = bbc;
      this.ctx.fillRect(bodyArea.x, bodyArea.y, bodyArea.width, bodyArea.height);
    }

    const hbc = headerBackgroundColor ?? tableBackgroundColor;
    if (hbc) {
      this.ctx.fillStyle = hbc;
      this.ctx.fillRect(headerArea.x, headerArea.y, headerArea.width, headerArea.height);
    }

    // Fill scrollbar background
    if (scrollbarTrackColor) {
      this.ctx.fillStyle = scrollbarTrackColor!;

      if (overflow.x) {
        this.ctx.fillRect(hsbOuterArea.x, hsbOuterArea.y, hsbOuterArea.width, hsbOuterArea.height);
      }

      if (overflow.y) {
        this.ctx.fillRect(vsbOuterArea.x, vsbOuterArea.y, vsbOuterArea.width, vsbOuterArea.height);
      }
    }

    const { rowTop, rowBottom, columnLeft, columnRight } = tableRanges;

    this.ctx.lineWidth = 1;

    // Draw outer border
    this.lineRenderer.hline(this.ctx, 0, 0, this.canvas.width);
    this.lineRenderer.hline(this.ctx, 0, this.canvas.height - BORDER_WIDTH, this.canvas.width);
    this.lineRenderer.vline(this.ctx, 0, 0, this.canvas.height);
    this.lineRenderer.vline(this.ctx, this.canvas.width - BORDER_WIDTH, 0, this.canvas.height);

    // Draw header bottom border
    this.lineRenderer.hline(this.ctx, 0, rowHeight, this.canvas.width);

    const gridWidth  = Math.min(mainArea.width,  contentSize.width);
    const gridHeight = Math.min(mainArea.height, contentSize.height + rowHeight);

    if (overflow.x) {
      // Draw horizontal scrollbar border
      this.lineRenderer.hline(this.ctx, 0, hsbOuterArea.y, this.canvas.width);
    } else {
      // Draw table content right border
      this.lineRenderer.vline(this.ctx, contentSize.width, 0, gridHeight);
    }

    if (overflow.y) {
      // Draw vertical scrollbar border
      this.lineRenderer.vline(this.ctx, vsbOuterArea.x, 0, this.canvas.height);
    } else {
      // Draw table content bottom border
      this.lineRenderer.hline(this.ctx, 0, gridHeight, contentSize.width);
    }

    // Draw grid horizontal lines
    for (let i = rowTop + 1; i < rowBottom; i++) {
      const y = i * rowHeight + rowHeight - scrollPos.y;
      this.lineRenderer.hline(this.ctx, 0, y, gridWidth);
    }

    // Draw grid vertical lines
    for (let j = columnLeft + 1; j < columnRight; j++) {
      const columnState = columnStates[j];
      const x = columnState.pos - scrollPos.x;
      this.lineRenderer.vline(this.ctx, x, 0, gridHeight);
    }

    this.ctx.clip(this.mainAreaClipRegion);

    const offsetX = -scrollPos.x + cellPadding;
    const offsetY = -scrollPos.y + rowHeight / 2 + rowHeight;

    // Draw header text
    for (let j = columnLeft; j < columnRight; j++) {
      const columnState = columnStates[j];
      const { pos, width, title: text } = columnState;

      const x = pos + offsetX;
      const y = rowHeight / 2;
      const maxWidth = width - cellPadding * 2;

      this.textRenderer.render(this.ctx, this.headerFont, text, x, y, maxWidth, true);
    }

    this.ctx.clip(this.bodyAreaClipRegion);

    // Draw body text
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

    this.image.setAttr("image", this.canvas);
  }

  private resizeCanvas(size: Size) {
    this.canvas.width  = size.width;
    this.canvas.height = size.height;
  }

  private makeFonts() {
    const {
      fontFamily,
      fontSize,
      fontColor,
      bodyFontColor,
      headerFontColor,
      fontStyle,
      bodyFontStyle,
      headerFontStyle
    } = this.ct.getTheme();

    const baseFont = { family: fontFamily, size: fontSize };

    const bodyFont = {
      ...baseFont,
      color: bodyFontColor ?? fontColor,
      style: bodyFontStyle ?? fontStyle
    };

    const headerFont = {
      ...baseFont,
      color:  headerFontColor ?? fontColor,
      style:  headerFontStyle ?? fontStyle
    };

    return { bodyFont, headerFont };
  }

  private makeClipRegions() {
    const { mainArea, bodyArea } = this.ct.getState();

    const mainAreaClipRegion = new Path2D();
    mainAreaClipRegion.rect(
      mainArea.x, mainArea.y, mainArea.width, mainArea.height);

    const bodyAreaClipRegion = new Path2D();
    bodyAreaClipRegion.rect(
      bodyArea.x, bodyArea.y, bodyArea.width, bodyArea.height);

    return { mainAreaClipRegion, bodyAreaClipRegion };
  }
}

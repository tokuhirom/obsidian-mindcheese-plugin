export default class GraphCanvas {
  private readonly canvasElement: HTMLCanvasElement;
  private readonly canvasContext: CanvasRenderingContext2D;
  private size: { w: number; h: number };
  private readonly lineColor: string;
  private readonly lineWidth: number;

  constructor(lineColor = "#555", lineWidth = 2) {
    this.lineColor = lineColor;
    this.lineWidth = lineWidth;
    this.canvasElement = document.createElement("canvas");
    this.canvasElement.className = "jsmind";
    this.canvasContext = this.canvasElement.getContext("2d");
    this.size = { w: 0, h: 0 };
  }

  element(): HTMLCanvasElement {
    return this.canvasElement;
  }

  setSize(w: number, h: number): void {
    this.size.w = w;
    this.size.h = h;
    this.canvasElement.width = w;
    this.canvasElement.height = h;
  }

  clear(): void {
    this.canvasContext.clearRect(0, 0, this.size.w, this.size.h);
  }

  drawLine(
    pout: { x: number; y: number },
    pin: { x: number; y: number },
    offset: { x: number; y: number }
  ): void {
    const ctx = this.canvasContext;
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";

    this.bezierTo(
      ctx,
      pin.x + offset.x,
      pin.y + offset.y,
      pout.x + offset.x,
      pout.y + offset.y
    );
  }

  private bezierTo(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + ((x2 - x1) * 2) / 3, y1, x1, y2, x2, y2);
    ctx.stroke();
  }
}

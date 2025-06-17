
import { CanvasContext } from "./types";

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = context;
  }

  getCanvasContext(): CanvasContext {
    return { canvas: this.canvas, ctx: this.ctx };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  destroy(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}


import { CanvasContext } from "./types";
import { MarginAreaExtractor, MarginArea } from "./MarginAreaExtractor";
import { AIInpaintingService } from "./AIInpaintingService";
import { BleedFallbackFiller } from "./BleedFallbackFiller";
import { debugFillUnfilledBleed } from "./debug/DebugFillUnfilledBleed";

export class AIBleedProcessor {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor({ canvas, ctx }: CanvasContext) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  async processIntelligentBleed(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number,
    bleedPrompt?: string
  ): Promise<void> {
    console.log('=== AI BLEED PROCESSING START ===');
    console.log(`Processing intelligent bleed with ${bleedPixels}px margin (prompt: ${bleedPrompt || "none"})`);

    try {
      const marginAreas = MarginAreaExtractor.extractAllBleedMarginAreas(bleedPixels, finalWidth, finalHeight);
      console.log(`Extracted ${marginAreas.length} (FULL bleed) margin areas to fill with AI.`);

      for (const area of marginAreas) {
        console.log(`[AIBleedProcessor] Requesting AI fill for area:`, area);
        try {
          await AIInpaintingService.withTimeout(
            this.processMarginArea(area, bleedPrompt),
            30000,
            `[${area.type}] AI inpainting`
          );
          console.log(`[AIBleedProcessor] Finished AI fill for ${area.type} margin`);
        } catch (aiErr: any) {
          console.warn(`[AIBleedProcessor] Failed or timed out AI fill for margin "${area.type}" (${aiErr.message}), skipping to fallback`);
        }
      }

      BleedFallbackFiller.finalFillBleedFromEdge(this.ctx, bleedPixels, finalWidth, finalHeight);
      debugFillUnfilledBleed(this.ctx, bleedPixels, finalWidth, finalHeight);

      console.log('=== AI BLEED PROCESSING COMPLETE ===');
    } catch (error) {
      console.error('AI bleed processing failed, keeping white padding:', error);
    }
  }

  private async processMarginArea(area: MarginArea, bleedPrompt?: string): Promise<void> {
    console.log(`Processing ${area.type} margin area... Area:`, JSON.stringify(area, null, 2));

    // Create context image for AI inpainting
    const contextCanvas = document.createElement('canvas');
    const contextCtx = contextCanvas.getContext('2d')!;

    const maxDimension = 512;
    const scale = Math.min(
      maxDimension / Math.max(area.width + area.contextWidth, area.height + area.contextHeight),
      1
    );

    contextCanvas.width = Math.round((area.width + area.contextWidth) * scale);
    contextCanvas.height = Math.round((area.height + area.contextHeight) * scale);

    contextCtx.fillStyle = '#FFFFFF';
    contextCtx.fillRect(0, 0, contextCanvas.width, contextCanvas.height);

    const sourceX = Math.min(area.x, area.contextX);
    const sourceY = Math.min(area.y, area.contextY);
    const sourceWidth = Math.max(area.x + area.width, area.contextX + area.contextWidth) - sourceX;
    const sourceHeight = Math.max(area.y + area.height, area.contextY + area.contextHeight) - sourceY;

    contextCtx.drawImage(
      this.canvas,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, contextCanvas.width, contextCanvas.height
    );

    // Create mask for the area to fill
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = contextCanvas.width;
    maskCanvas.height = contextCanvas.height;
    const maskCtx = maskCanvas.getContext('2d')!;

    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    maskCtx.fillStyle = '#FFFFFF';
    const fillX = Math.round((area.x - sourceX) * scale);
    const fillY = Math.round((area.y - sourceY) * scale);
    const fillWidth = Math.round(area.width * scale);
    const fillHeight = Math.round(area.height * scale);
    maskCtx.fillRect(fillX, fillY, fillWidth, fillHeight);

    // Use inpaint service
    const filledImage = await AIInpaintingService.tryAIInpainting(contextCanvas, maskCanvas, bleedPrompt);

    if (filledImage) {
      this.applyFilledArea(filledImage, area, sourceX, sourceY, sourceWidth, sourceHeight, scale);
      console.log(`Successfully filled ${area.type} margin with AI`);
    } else {
      console.log(`AI inpainting failed for ${area.type} margin, keeping white`);
    }
  }

  private applyFilledArea(
    filledImage: HTMLImageElement,
    area: MarginArea,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    scale: number
  ): void {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.round(area.width);
    tempCanvas.height = Math.round(area.height);
    const tempCtx = tempCanvas.getContext('2d')!;

    const fillX = (area.x - sourceX) * scale;
    const fillY = (area.y - sourceY) * scale;
    const fillWidth = area.width * scale;
    const fillHeight = area.height * scale;

    tempCtx.drawImage(
      filledImage,
      fillX, fillY, fillWidth, fillHeight,
      0, 0, tempCanvas.width, tempCanvas.height
    );

    this.ctx.drawImage(tempCanvas, area.x, area.y);
  }
}


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
    console.log(`[AIBleedProcessor] Processing intelligent bleed with ${bleedPixels}px margin (prompt: ${bleedPrompt || "none"})`);

    try {
      const marginAreas = MarginAreaExtractor.extractAllBleedMarginAreas(bleedPixels, finalWidth, finalHeight);
      console.log(`[AIBleedProcessor] Extracted ${marginAreas.length} margin areas to fill with AI.`);

      // Process areas sequentially with better error handling
      for (let i = 0; i < marginAreas.length; i++) {
        const area = marginAreas[i];
        console.log(`[AIBleedProcessor] Processing area ${i + 1}/${marginAreas.length}:`, area.type);
        
        try {
          await this.processMarginArea(area, bleedPrompt);
          console.log(`[AIBleedProcessor] Completed AI fill for ${area.type} margin`);
        } catch (aiErr: any) {
          console.warn(`[AIBleedProcessor] Failed AI fill for margin "${area.type}" (${aiErr.message}), continuing to next area`);
          // Continue with next area instead of breaking the entire process
        }
      }

      // Always apply fallback fill to ensure no white areas remain
      console.log('[AIBleedProcessor] Applying fallback fill for any remaining white areas');
      BleedFallbackFiller.finalFillBleedFromEdge(this.ctx, bleedPixels, finalWidth, finalHeight);
      debugFillUnfilledBleed(this.ctx, bleedPixels, finalWidth, finalHeight);

      console.log('=== AI BLEED PROCESSING COMPLETE ===');
    } catch (error) {
      console.error('[AIBleedProcessor] AI bleed processing failed:', error);
      console.log('[AIBleedProcessor] Applying fallback fill due to error');
      // Ensure we always have some bleed fill even if AI processing fails completely
      BleedFallbackFiller.finalFillBleedFromEdge(this.ctx, bleedPixels, finalWidth, finalHeight);
    }
  }

  private async processMarginArea(area: MarginArea, bleedPrompt?: string): Promise<void> {
    console.log(`[AIBleedProcessor] Processing ${area.type} margin area...`);

    try {
      // Create context image for AI inpainting
      const contextCanvas = document.createElement('canvas');
      const contextCtx = contextCanvas.getContext('2d');
      
      if (!contextCtx) {
        throw new Error('Failed to get context for margin area processing');
      }

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
      const maskCtx = maskCanvas.getContext('2d');
      
      if (!maskCtx) {
        throw new Error('Failed to get mask context');
      }

      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      maskCtx.fillStyle = '#FFFFFF';
      const fillX = Math.round((area.x - sourceX) * scale);
      const fillY = Math.round((area.y - sourceY) * scale);
      const fillWidth = Math.round(area.width * scale);
      const fillHeight = Math.round(area.height * scale);
      maskCtx.fillRect(fillX, fillY, fillWidth, fillHeight);

      // Use inpaint service with timeout
      console.log(`[AIBleedProcessor] Calling AI inpainting for ${area.type}`);
      const filledImage = await AIInpaintingService.tryAIInpainting(contextCanvas, maskCanvas, bleedPrompt);

      if (filledImage) {
        this.applyFilledArea(filledImage, area, sourceX, sourceY, sourceWidth, sourceHeight, scale);
        console.log(`[AIBleedProcessor] Successfully filled ${area.type} margin with AI`);
      } else {
        console.log(`[AIBleedProcessor] AI inpainting returned null for ${area.type} margin`);
      }
    } catch (error) {
      console.error(`[AIBleedProcessor] Error processing ${area.type} margin:`, error);
      throw error; // Re-throw to be caught by the caller
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
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.round(area.width);
      tempCanvas.height = Math.round(area.height);
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        throw new Error('Failed to get temp canvas context');
      }

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
      console.log(`[AIBleedProcessor] Applied filled area for ${area.type}`);
    } catch (error) {
      console.error(`[AIBleedProcessor] Error applying filled area:`, error);
    }
  }
}

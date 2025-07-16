
import { ProcessingParameters } from "@/types/print";
import { ProcessingResult, CanvasContext } from "./types";
import { ImageRenderer } from "./ImageRenderer";
import { AIBleedProcessor } from "./AIBleedProcessor";
import { CutLineRenderer } from "./CutLineRenderer";
import { CancellationToken } from "./CancellationToken";
import { mmToPixels, canvasToDataURL } from "./utils";
import { AIInpaintingService } from "./AIInpaintingService";
import { BleedFallbackFiller } from "./BleedFallbackFiller";
import { AIOutpaintingService } from "./AIOutpaintingService";

export class ProcessingWorkflow {
  private imageRenderer: ImageRenderer;
  private aiBleedProcessor: AIBleedProcessor;
  private cutLineRenderer: CutLineRenderer;
  private cancellationToken: CancellationToken;
  private onProgressUpdate?: (step: string, progress?: number) => void;
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(
    canvasContext: CanvasContext,
    cancellationToken: CancellationToken,
    onProgressUpdate?: (step: string, progress?: number) => void
  ) {
    this.canvas = canvasContext.canvas;
    this.ctx = canvasContext.ctx;
    this.cancellationToken = cancellationToken;
    this.onProgressUpdate = onProgressUpdate;

    this.imageRenderer = new ImageRenderer(canvasContext);
    this.aiBleedProcessor = new AIBleedProcessor(canvasContext);
    this.cutLineRenderer = new CutLineRenderer(this.ctx);
  }

  private updateProgress(step: string, progress?: number) {
    console.log(`[ProcessingWorkflow] ${step}${progress !== undefined ? ` (${progress.toFixed(1)}%)` : ''}`);
    if (this.onProgressUpdate) {
      this.onProgressUpdate(step, progress);
    }
  }

  async processImageWithNewWorkflow(img: HTMLImageElement, parameters: ProcessingParameters): Promise<ProcessingResult> {
    const originalDimensions = { width: img.width, height: img.height };
    console.log('=== NEW WORKFLOW IMAGE PROCESSING ===');
    console.log('[ProcessingWorkflow] Processing with streamlined workflow. Original dimensions:', originalDimensions);
    
    this.cancellationToken.throwIfCancelled();
    
    // Calculate dimensions with bleed
    const finalWidth = mmToPixels(parameters.finalDimensions.width, parameters.dpi);
    const finalHeight = mmToPixels(parameters.finalDimensions.height, parameters.dpi);
    const bleedPixels = mmToPixels(parameters.bleedMargin, parameters.dpi);
    
    const canvasWidth = finalWidth + (bleedPixels * 2);
    const canvasHeight = finalHeight + (bleedPixels * 2);
    
    console.log(`[ProcessingWorkflow] Target dimensions: ${finalWidth}x${finalHeight}px (${parameters.finalDimensions.width}x${parameters.finalDimensions.height}mm at ${parameters.dpi}DPI)`);
    console.log(`[ProcessingWorkflow] Canvas with bleed: ${canvasWidth}x${canvasHeight}px (includes ${bleedPixels}px bleed)`);
    
    // Step 1: Setup canvas and position content
    console.log('=== STEP 1: CANVAS SETUP & RESIZE ===');
    this.updateProgress('Setting up canvas and resizing content', 20);
    this.imageRenderer.setupCanvas(canvasWidth, canvasHeight);
    await this.imageRenderer.resizeAndPositionContent(img, finalWidth, finalHeight, bleedPixels);
    console.log('[ProcessingWorkflow] Content positioned successfully');
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 2: AI-powered content extrapolation for bleed areas
    console.log('=== STEP 2: AI CONTENT EXTRAPOLATION ===');
    
    // Check if AI outpainting is enabled
    const useAIOutpaint = (parameters as any).useAIOutpaint;
    
    if (useAIOutpaint) {
      this.updateProgress('Using AI outpainting to extend image naturally', 40);
      console.log('[ProcessingWorkflow] Using AI outpainting for bleed areas');
      try {
        // Get current canvas as blob for outpainting
        const canvasBlob = await new Promise<Blob>((resolve, reject) => {
          this.canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to get canvas blob'));
          }, 'image/png');
        });

        const outpaintingService = new AIOutpaintingService();
        const result = await outpaintingService.outpaintImage(
          canvasBlob,
          canvasWidth,
          canvasHeight,
          (parameters as any).bleedPrompt || 'Extend image naturally'
        );

        if (result.success && result.imageUrl) {
          // Replace canvas content with outpainted image
          const outpaintedImg = new Image();
          await new Promise((resolve, reject) => {
            outpaintedImg.onload = resolve;
            outpaintedImg.onerror = reject;
            outpaintedImg.src = result.imageUrl!;
          });
          
          this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          this.ctx.drawImage(outpaintedImg, 0, 0, canvasWidth, canvasHeight);
          console.log('[ProcessingWorkflow] AI outpainting completed successfully');
        } else {
          throw new Error(result.error || 'AI outpainting failed');
        }
      } catch (error: any) {
        if (this.cancellationToken.isCancelled) {
          throw error;
        }
        console.log('[ProcessingWorkflow] AI outpainting failed, falling back to standard methods:', error?.message || error);
        this.updateProgress('AI outpainting failed, using fallback fill', 50);
        BleedFallbackFiller.finalFillBleedFromEdge(this.ctx, bleedPixels, finalWidth, finalHeight);
      }
    } else {
      // Use existing AI inpainting or fallback
      const aiConfig = AIInpaintingService.getApiConfiguration();
      
      if (aiConfig.hasAnyKey) {
        this.updateProgress('Applying AI content extrapolation for bleed areas', 40);
        console.log('[ProcessingWorkflow] Performing AI-powered content extrapolation');
        try {
          // Set a reasonable timeout for AI processing
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.log('[ProcessingWorkflow] AI processing timeout reached');
          }, 30000); // 30 seconds total

          await this.aiBleedProcessor.processIntelligentBleed(bleedPixels, finalWidth, finalHeight, (parameters as any).bleedPrompt || '');
          clearTimeout(timeoutId);
          console.log('[ProcessingWorkflow] AI content extrapolation completed successfully');
        } catch (error: any) {
          if (this.cancellationToken.isCancelled) {
            throw error;
          }
          console.log('[ProcessingWorkflow] AI extrapolation failed or timed out, using standard fill methods:', error?.message || error);
          this.updateProgress('AI processing failed, using standard bleed fill', 50);
          BleedFallbackFiller.finalFillBleedFromEdge(this.ctx, bleedPixels, finalWidth, finalHeight);
        }
      } else {
        console.log('[ProcessingWorkflow] No AI keys configured, using standard bleed fill');
        this.updateProgress('Using standard bleed fill methods', 40);
        BleedFallbackFiller.finalFillBleedFromEdge(this.ctx, bleedPixels, finalWidth, finalHeight);
      }
    }
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 3: Add cut lines
    console.log('=== STEP 3: ADDING CUT LINES ===');
    this.updateProgress('Adding cut lines', 80);
    this.cutLineRenderer.addCutLines(parameters, finalWidth, finalHeight, bleedPixels);
    console.log('[ProcessingWorkflow] Cut lines added successfully');
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 4: Export as high-resolution data
    console.log('=== STEP 4: EXPORT HIGH-RESOLUTION ===');
    this.updateProgress('Exporting high-resolution image', 90);
    
    const processedImageUrl = await Promise.race([
      canvasToDataURL(this.canvas),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Canvas export timeout')), 10000)
      )
    ]) as string;
    
    console.log('[ProcessingWorkflow] High-resolution export completed, size:', processedImageUrl.length);
    
    this.cancellationToken.throwIfCancelled();
    
    // Validate the output
    if (processedImageUrl.length < 1000) {
      console.error('[ProcessingWorkflow] Generated image URL is suspiciously small');
      throw new Error('Generated image appears to be empty or corrupted');
    }
    
    this.updateProgress('New workflow complete', 100);
    console.log('=== NEW WORKFLOW PROCESSING COMPLETE ===');
    return {
      processedImageUrl,
      originalDimensions,
      finalDimensions: { width: canvasWidth, height: canvasHeight },
      appliedBleed: parameters.bleedMargin
    };
  }
}

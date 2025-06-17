import { ProcessingParameters, UploadedFile } from "@/types/print";
import { ProcessingResult, CanvasContext } from "./types";
import { PDFProcessor } from "./PDFProcessor";
import { ImageRenderer } from "./ImageRenderer";
import { AIBleedProcessor } from "./AIBleedProcessor";
import { CutLineRenderer } from "./CutLineRenderer";
import { CancellationToken } from "./CancellationToken";
import { mmToPixels, canvasToDataURL } from "./utils";
import { AIInpaintingService } from "./AIInpaintingService";

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageRenderer: ImageRenderer;
  private pdfProcessor: PDFProcessor;
  private aiBleedProcessor: AIBleedProcessor;
  private cutLineRenderer: CutLineRenderer;
  private cancellationToken: CancellationToken;
  private onProgressUpdate?: (step: string, progress?: number) => void;

  constructor(onProgressUpdate?: (step: string, progress?: number) => void) {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = context;
    this.onProgressUpdate = onProgressUpdate;
    this.cancellationToken = new CancellationToken();

    const canvasContext: CanvasContext = { canvas: this.canvas, ctx: this.ctx };
    this.imageRenderer = new ImageRenderer(canvasContext);
    this.pdfProcessor = new PDFProcessor(this.imageRenderer);
    this.aiBleedProcessor = new AIBleedProcessor(canvasContext);
    this.cutLineRenderer = new CutLineRenderer(this.ctx);
  }

  cancel(reason?: string): void {
    console.log('[ImageProcessor] Cancelling new workflow processing:', reason);
    this.cancellationToken.cancel(reason);
  }

  private updateProgress(step: string, progress?: number) {
    console.log(`[New Workflow] ${step}${progress !== undefined ? ` (${progress.toFixed(1)}%)` : ''}`);
    if (this.onProgressUpdate) {
      this.onProgressUpdate(step, progress);
    }
  }

  async processFile(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('=== NEW WORKFLOW PROCESSING START ===');
    console.log('Processing with new workflow. Parameters:', parameters);
    console.log('File info:', { name: file.file.name, type: file.type, size: file.file.size });
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 1: Convert file to image (PDF → PNG, or use image as-is)
    let img: HTMLImageElement;
    if (file.type === 'pdf') {
      console.log('Converting PDF to highest quality PNG');
      this.updateProgress('Converting PDF to high-quality PNG', 10);
      try {
        img = await this.pdfProcessor.processPDF(file, parameters);
        console.log('PDF converted successfully to PNG');
      } catch (error) {
        console.error('PDF conversion failed:', error);
        throw new Error(
          'PDF conversion failed. ' +
          (error instanceof Error ? error.message : String(error)) +
          ' Please try converting your PDF to PNG/JPG format instead.'
        );
      }
    } else {
      console.log('Loading image file directly');
      this.updateProgress('Loading image file', 10);
      img = await this.loadImageFile(file);
    }

    this.cancellationToken.throwIfCancelled();

    // Step 2: Process the image through the streamlined workflow
    return this.processImageWithNewWorkflow(img, parameters);
  }

  private async loadImageFile(file: UploadedFile): Promise<HTMLImageElement> {
    const img = new Image();
    const imageUrl = URL.createObjectURL(file.file);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        console.log(`Image loaded: ${img.width}x${img.height}`);
        URL.revokeObjectURL(imageUrl);
        resolve(img);
      };
      img.onerror = (error) => {
        console.error('Failed to load image:', error);
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image - the file may be corrupted'));
      };
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
  }

  private async processImageWithNewWorkflow(img: HTMLImageElement, parameters: ProcessingParameters): Promise<ProcessingResult> {
    const originalDimensions = { width: img.width, height: img.height };
    console.log('=== NEW WORKFLOW IMAGE PROCESSING ===');
    console.log('Processing with streamlined workflow. Original dimensions:', originalDimensions);
    
    this.cancellationToken.throwIfCancelled();
    
    // Calculate dimensions with bleed
    const finalWidth = mmToPixels(parameters.finalDimensions.width, parameters.dpi);
    const finalHeight = mmToPixels(parameters.finalDimensions.height, parameters.dpi);
    const bleedPixels = mmToPixels(parameters.bleedMargin, parameters.dpi);
    
    const canvasWidth = finalWidth + (bleedPixels * 2);
    const canvasHeight = finalHeight + (bleedPixels * 2);
    
    console.log(`Target dimensions: ${finalWidth}x${finalHeight}px (${parameters.finalDimensions.width}x${parameters.finalDimensions.height}mm at ${parameters.dpi}DPI)`);
    console.log(`Canvas with bleed: ${canvasWidth}x${canvasHeight}px (includes ${bleedPixels}px bleed)`);
    
    // Step 1: Setup canvas and position content
    console.log('=== STEP 1: CANVAS SETUP & RESIZE ===');
    this.updateProgress('Setting up canvas and resizing content', 20);
    this.imageRenderer.setupCanvas(canvasWidth, canvasHeight);
    await this.imageRenderer.resizeAndPositionContent(img, finalWidth, finalHeight, bleedPixels);
    console.log('Content positioned successfully');
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 2: AI-powered content extrapolation for bleed areas
    console.log('=== STEP 2: AI CONTENT EXTRAPOLATION ===');
    const aiConfig = AIInpaintingService.getApiConfiguration();
    
    if (aiConfig.hasAnyKey) {
      this.updateProgress('Applying AI content extrapolation for bleed areas', 40);
      console.log('Performing AI-powered content extrapolation');
      try {
        await this.aiBleedProcessor.processIntelligentBleed(bleedPixels, finalWidth, finalHeight, (parameters as any).bleedPrompt);
        console.log('AI content extrapolation completed successfully');
      } catch (error) {
        if (this.cancellationToken.isCancelled) {
          throw error;
        }
        console.log('AI extrapolation failed, using standard fill methods:', error);
        this.updateProgress('AI failed, using standard bleed fill', 50);
        await this.fallbackBleedFill(bleedPixels, finalWidth, finalHeight);
      }
    } else {
      console.log('No AI keys configured, using standard bleed fill');
      this.updateProgress('Using standard bleed fill methods', 40);
      await this.fallbackBleedFill(bleedPixels, finalWidth, finalHeight);
    }
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 3: Add cut lines
    console.log('=== STEP 3: ADDING CUT LINES ===');
    this.updateProgress('Adding cut lines', 80);
    this.cutLineRenderer.addCutLines(parameters, finalWidth, finalHeight, bleedPixels);
    console.log('Cut lines added successfully');
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 4: Export as high-resolution data
    console.log('=== STEP 4: EXPORT HIGH-RESOLUTION ===');
    this.updateProgress('Exporting high-resolution image', 90);
    const processedImageUrl = await canvasToDataURL(this.canvas, 'image/png', 1.0);
    console.log('High-resolution export completed, size:', processedImageUrl.length);
    
    this.cancellationToken.throwIfCancelled();
    
    // Validate the output
    if (processedImageUrl.length < 1000) {
      console.error('Generated image URL is suspiciously small');
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

  private async fallbackBleedFill(bleedPixels: number, finalWidth: number, finalHeight: number): Promise<void> {
    // Simple edge extension fallback for when AI is not available
    console.log('Applying fallback bleed fill');
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data, width, height } = imageData;
    
    // Extend edges to fill bleed areas
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        
        // Check if pixel is in bleed area
        const isInBleed = x < bleedPixels || x >= width - bleedPixels || 
                         y < bleedPixels || y >= height - bleedPixels;
        
        if (isInBleed) {
          // Find nearest content pixel and copy its color
          let sourceX = Math.max(bleedPixels, Math.min(x, width - bleedPixels - 1));
          let sourceY = Math.max(bleedPixels, Math.min(y, height - bleedPixels - 1));
          
          const sourceIndex = (sourceY * width + sourceX) * 4;
          
          data[pixelIndex] = data[sourceIndex];         // R
          data[pixelIndex + 1] = data[sourceIndex + 1]; // G
          data[pixelIndex + 2] = data[sourceIndex + 2]; // B
          data[pixelIndex + 3] = data[sourceIndex + 3]; // A
        }
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
    console.log('Fallback bleed fill completed');
  }

  destroy() {
    this.cancel('Processor destroyed');
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

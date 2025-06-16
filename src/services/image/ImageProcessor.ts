
import { ProcessingParameters, UploadedFile } from "@/types/print";
import { ProcessingResult, CanvasContext } from "./types";
import { PDFProcessor } from "./PDFProcessor";
import { ImageRenderer } from "./ImageRenderer";
import { BleedProcessor } from "./BleedProcessor";
import { AsyncBleedProcessor } from "./AsyncBleedProcessor";
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
  private bleedProcessor: BleedProcessor;
  private asyncBleedProcessor: AsyncBleedProcessor;
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
    this.bleedProcessor = new BleedProcessor(this.ctx, this.canvas);
    this.asyncBleedProcessor = new AsyncBleedProcessor(this.ctx, this.canvas);
    this.aiBleedProcessor = new AIBleedProcessor(canvasContext);
    this.cutLineRenderer = new CutLineRenderer(this.ctx);
  }

  cancel(reason?: string): void {
    console.log('[ImageProcessor] Cancelling processing:', reason);
    this.cancellationToken.cancel(reason);
    this.asyncBleedProcessor.cancel();
  }

  private updateProgress(step: string, progress?: number) {
    console.log(`[ImageProcessor] ${step}${progress !== undefined ? ` (${progress.toFixed(1)}%)` : ''}`);
    if (this.onProgressUpdate) {
      this.onProgressUpdate(step, progress);
    }
  }

  async processFile(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('=== IMAGE PROCESSING START ===');
    console.log('Starting image processing with parameters:', parameters);
    console.log('File info:', { name: file.file.name, type: file.type, size: file.file.size });
    
    this.cancellationToken.throwIfCancelled();
    
    // Check AI configuration upfront
    const aiConfig = AIInpaintingService.getApiConfiguration();
    console.log('AI Configuration:', aiConfig);
    
    if (file.type === 'pdf') {
      console.log('Processing as PDF file');
      this.updateProgress('Loading PDF document');
      try {
        const img = await this.pdfProcessor.processPDF(file, parameters);
        console.log('PDF processed successfully, now processing image data');
        return this.processImageData(img, parameters);
      } catch (error) {
        console.error('PDF processing failed:', error);
        throw new Error(
          'PDF processing failed. ' +
          (error instanceof Error ? error.message : String(error)) +
          ' Please try converting your PDF to PNG/JPG format instead.'
        );
      }
    } else {
      console.log('Processing as image file');
      this.updateProgress('Loading image file');
      return this.processImage(file, parameters);
    }
  }

  private async processImage(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('Processing image file:', file.file.name);
    
    const img = new Image();
    const imageUrl = URL.createObjectURL(file.file);
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          console.log(`Image loaded successfully: ${img.width}x${img.height}`);
          const result = await this.processImageData(img, parameters);
          URL.revokeObjectURL(imageUrl);
          resolve(result);
        } catch (error) {
          console.error('Error processing image data:', error);
          URL.revokeObjectURL(imageUrl);
          reject(error);
        }
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

  private async processImageData(img: HTMLImageElement, parameters: ProcessingParameters): Promise<ProcessingResult> {
    const originalDimensions = { width: img.width, height: img.height };
    console.log('=== PROCESSING IMAGE DATA ===');
    console.log('Processing image data. Original dimensions:', originalDimensions);
    
    this.cancellationToken.throwIfCancelled();
    
    // Calculate dimensions with bleed
    const finalWidth = mmToPixels(parameters.finalDimensions.width, parameters.dpi);
    const finalHeight = mmToPixels(parameters.finalDimensions.height, parameters.dpi);
    const bleedPixels = mmToPixels(parameters.bleedMargin, parameters.dpi);
    
    const canvasWidth = finalWidth + (bleedPixels * 2);
    const canvasHeight = finalHeight + (bleedPixels * 2);
    
    console.log(`Final dimensions: ${finalWidth}x${finalHeight}px (${parameters.finalDimensions.width}x${parameters.finalDimensions.height}mm at ${parameters.dpi}DPI)`);
    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}px (includes ${bleedPixels}px bleed on each side)`);
    
    // Step 1: Canvas setup
    console.log('=== STEP 1: CANVAS SETUP ===');
    this.updateProgress('Setting up canvas and positioning content', 0);
    this.imageRenderer.setupCanvas(canvasWidth, canvasHeight);
    console.log('Canvas setup completed');
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 2: Content positioning
    console.log('=== STEP 2: CONTENT POSITIONING ===');
    this.updateProgress('Positioning content within canvas', 10);
    await this.imageRenderer.resizeAndPositionContent(img, finalWidth, finalHeight, bleedPixels);
    console.log('Content positioning completed');
    
    this.cancellationToken.throwIfCancelled();
    
    // Check canvas state after content positioning
    const imageDataAfterContent = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const hasContentData = this.checkCanvasHasContent(imageDataAfterContent);
    console.log('Canvas has content after positioning:', hasContentData);
    
    // Step 3: AI-powered intelligent bleed extension (with graceful degradation)
    console.log('=== STEP 3: AI BLEED EXTENSION ===');
    const aiConfig = AIInpaintingService.getApiConfiguration();
    
    if (aiConfig.hasAnyKey) {
      this.updateProgress('Processing AI-powered bleed extension', 30);
      console.log('AI keys available, attempting AI bleed processing');
      try {
        await this.aiBleedProcessor.processIntelligentBleed(bleedPixels, finalWidth, finalHeight);
        console.log('AI bleed extension completed successfully');
      } catch (error) {
        if (this.cancellationToken.isCancelled) {
          throw error;
        }
        console.log('AI bleed extension failed, will use fallback methods:', error);
        this.updateProgress('AI processing failed, using fallback methods', 40);
      }
    } else {
      console.log('No AI keys configured, skipping AI bleed processing');
      this.updateProgress('Using standard bleed extension (no AI keys configured)', 30);
    }
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 4: Async fallback bleed processing for any remaining areas
    console.log('=== STEP 4: ASYNC BLEED PROCESSING ===');
    this.updateProgress('Applying bleed extension', 50);
    
    await this.asyncBleedProcessor.extendBleedAreas(
      bleedPixels, 
      finalWidth, 
      finalHeight,
      (progress) => this.updateProgress('Processing bleed areas', 50 + (progress * 0.3))
    );
    console.log('Async bleed processing completed');
    
    this.cancellationToken.throwIfCancelled();
    
    // Check canvas state after bleed processing
    const imageDataAfterBleed = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const hasBleedData = this.checkCanvasHasContent(imageDataAfterBleed);
    console.log('Canvas has content after bleed processing:', hasBleedData);
    
    // Step 5: Cut lines
    console.log('=== STEP 5: CUT LINES ===');
    this.updateProgress('Adding cut lines', 85);
    this.cutLineRenderer.addCutLines(parameters, finalWidth, finalHeight, bleedPixels);
    console.log('Cut lines added');
    
    this.cancellationToken.throwIfCancelled();
    
    // Final canvas check
    const finalImageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const hasFinalData = this.checkCanvasHasContent(finalImageData);
    console.log('Canvas has content after cut lines:', hasFinalData);
    
    // Step 6: Canvas conversion
    console.log('=== STEP 6: CANVAS CONVERSION ===');
    this.updateProgress('Converting to final format', 95);
    const processedImageUrl = await canvasToDataURL(this.canvas);
    console.log('Canvas converted to data URL successfully, length:', processedImageUrl.length);
    
    this.cancellationToken.throwIfCancelled();
    
    // Validate the output
    if (processedImageUrl.length < 1000) {
      console.error('Generated image URL is suspiciously small');
      throw new Error('Generated image appears to be empty or corrupted');
    }
    
    this.updateProgress('Processing complete', 100);
    console.log('=== IMAGE PROCESSING COMPLETE ===');
    return {
      processedImageUrl,
      originalDimensions,
      finalDimensions: { width: canvasWidth, height: canvasHeight },
      appliedBleed: parameters.bleedMargin
    };
  }

  private checkCanvasHasContent(imageData: ImageData): boolean {
    const { data } = imageData;
    // Check if any pixel is not white (255,255,255,255)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // If we find any non-white pixel, there's content
      if (r !== 255 || g !== 255 || b !== 255 || a !== 255) {
        return true;
      }
    }
    return false;
  }

  destroy() {
    this.cancel('Processor destroyed');
    // Clean up resources
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

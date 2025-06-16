
import { ProcessingParameters, UploadedFile } from "@/types/print";
import { ProcessingResult, CanvasContext } from "./types";
import { PDFProcessor } from "./PDFProcessor";
import { ImageRenderer } from "./ImageRenderer";
import { BleedProcessor } from "./BleedProcessor";
import { AIBleedProcessor } from "./AIBleedProcessor";
import { CutLineRenderer } from "./CutLineRenderer";
import { mmToPixels, canvasToDataURL } from "./utils";
import { AIInpaintingService } from "./AIInpaintingService";

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageRenderer: ImageRenderer;
  private pdfProcessor: PDFProcessor;
  private bleedProcessor: BleedProcessor;
  private aiBleedProcessor: AIBleedProcessor;
  private cutLineRenderer: CutLineRenderer;
  private onProgressUpdate?: (step: string) => void;

  constructor(onProgressUpdate?: (step: string) => void) {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = context;
    this.onProgressUpdate = onProgressUpdate;

    const canvasContext: CanvasContext = { canvas: this.canvas, ctx: this.ctx };
    this.imageRenderer = new ImageRenderer(canvasContext);
    this.pdfProcessor = new PDFProcessor(this.imageRenderer);
    this.bleedProcessor = new BleedProcessor(this.ctx, this.canvas);
    this.aiBleedProcessor = new AIBleedProcessor(canvasContext);
    this.cutLineRenderer = new CutLineRenderer(this.ctx);
  }

  private updateProgress(step: string) {
    console.log(`[ImageProcessor] ${step}`);
    if (this.onProgressUpdate) {
      this.onProgressUpdate(step);
    }
  }

  async processFile(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('=== IMAGE PROCESSING START ===');
    console.log('Starting image processing with parameters:', parameters);
    console.log('File info:', { name: file.file.name, type: file.type, size: file.file.size });
    
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
    this.updateProgress('Setting up canvas and positioning content');
    this.imageRenderer.setupCanvas(canvasWidth, canvasHeight);
    console.log('Canvas setup completed');
    
    // Step 2: Content positioning
    console.log('=== STEP 2: CONTENT POSITIONING ===');
    await this.imageRenderer.resizeAndPositionContent(img, finalWidth, finalHeight, bleedPixels);
    console.log('Content positioning completed');
    
    // Check canvas state after content positioning
    const imageDataAfterContent = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const hasContentData = this.checkCanvasHasContent(imageDataAfterContent);
    console.log('Canvas has content after positioning:', hasContentData);
    
    // Step 3: AI-powered intelligent bleed extension (with graceful degradation)
    console.log('=== STEP 3: AI BLEED EXTENSION ===');
    const aiConfig = AIInpaintingService.getApiConfiguration();
    
    if (aiConfig.hasAnyKey) {
      this.updateProgress('Processing AI-powered bleed extension');
      console.log('AI keys available, attempting AI bleed processing');
      try {
        await this.aiBleedProcessor.processIntelligentBleed(bleedPixels, finalWidth, finalHeight);
        console.log('AI bleed extension completed successfully');
      } catch (error) {
        console.log('AI bleed extension failed, will use fallback methods:', error);
        this.updateProgress('AI processing failed, using fallback methods');
      }
    } else {
      console.log('No AI keys configured, skipping AI bleed processing');
      this.updateProgress('Using standard bleed extension (no AI keys configured)');
    }
    
    // Step 4: Fallback bleed processing for any remaining areas
    console.log('=== STEP 4: FALLBACK BLEED PROCESSING ===');
    this.updateProgress('Applying fallback bleed extension');
    await this.bleedProcessor.extendBleedAreas(bleedPixels, finalWidth, finalHeight);
    console.log('Fallback bleed processing completed');
    
    // Check canvas state after bleed processing
    const imageDataAfterBleed = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const hasBleedData = this.checkCanvasHasContent(imageDataAfterBleed);
    console.log('Canvas has content after bleed processing:', hasBleedData);
    
    // Step 5: Cut lines
    console.log('=== STEP 5: CUT LINES ===');
    this.updateProgress('Adding cut lines and finalizing');
    this.cutLineRenderer.addCutLines(parameters, finalWidth, finalHeight, bleedPixels);
    console.log('Cut lines added');
    
    // Final canvas check
    const finalImageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const hasFinalData = this.checkCanvasHasContent(finalImageData);
    console.log('Canvas has content after cut lines:', hasFinalData);
    
    // Step 6: Canvas conversion
    console.log('=== STEP 6: CANVAS CONVERSION ===');
    this.updateProgress('Converting to final format');
    const processedImageUrl = await canvasToDataURL(this.canvas);
    console.log('Canvas converted to data URL successfully, length:', processedImageUrl.length);
    
    // Validate the output
    if (processedImageUrl.length < 1000) {
      console.error('Generated image URL is suspiciously small');
      throw new Error('Generated image appears to be empty or corrupted');
    }
    
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
    // Clean up resources
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

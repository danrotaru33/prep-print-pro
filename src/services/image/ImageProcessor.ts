
import { ProcessingParameters, UploadedFile } from "@/types/print";
import { ProcessingResult } from "./types";
import { CancellationToken } from "./CancellationToken";
import { CanvasManager } from "./CanvasManager";
import { FileProcessor } from "./FileProcessor";
import { ProcessingWorkflow } from "./ProcessingWorkflow";
import { ImageRenderer } from "./ImageRenderer";

export class ImageProcessor {
  private canvasManager: CanvasManager;
  private fileProcessor: FileProcessor;
  private processingWorkflow: ProcessingWorkflow;
  private cancellationToken: CancellationToken;
  private onProgressUpdate?: (step: string, progress?: number) => void;

  constructor(onProgressUpdate?: (step: string, progress?: number) => void) {
    this.onProgressUpdate = onProgressUpdate;
    this.cancellationToken = new CancellationToken();
    this.canvasManager = new CanvasManager();

    const canvasContext = this.canvasManager.getCanvasContext();
    const imageRenderer = new ImageRenderer(canvasContext);
    
    this.fileProcessor = new FileProcessor(imageRenderer);
    this.processingWorkflow = new ProcessingWorkflow(
      canvasContext,
      this.cancellationToken,
      onProgressUpdate
    );
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
    
    this.cancellationToken.throwIfCancelled();
    
    // Step 1: Convert file to image (PDF → PNG, or use image as-is)
    this.updateProgress('Converting PDF to high-quality PNG', 10);
    const img = await this.fileProcessor.processFile(file, parameters);

    this.cancellationToken.throwIfCancelled();

    // Step 2: Process the image through the streamlined workflow
    return this.processingWorkflow.processImageWithNewWorkflow(img, parameters);
  }

  destroy() {
    this.cancel('Processor destroyed');
    this.canvasManager.destroy();
  }
}

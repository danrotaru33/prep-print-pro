
import * as pdfjsLib from 'pdfjs-dist';
import { UploadedFile, ProcessingParameters } from "@/types/print";
import { ImageRenderer } from "./ImageRenderer";

export class PDFProcessor {
  private imageRenderer: ImageRenderer;
  private workerInitialized: boolean = false;

  constructor(imageRenderer: ImageRenderer) {
    this.imageRenderer = imageRenderer;
  }

  private async initializeWorker(): Promise<void> {
    if (this.workerInitialized) return;

    console.log('[PDFProcessor] Initializing PDF.js worker...');

    try {
      // Try different worker source strategies based on environment
      const workerSources = [
        // Strategy 1: Use local bundled worker (matching version 4.5.136)
        () => '/pdf.worker.min.js',
        // Strategy 2: Use CDN with exact version match  
        () => 'https://unpkg.com/pdfjs-dist@4.5.136/build/pdf.worker.mjs',
        // Strategy 3: Use fallback CDN
        () => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js'
      ];

      let workerInitialized = false;
      let lastError: Error | null = null;

      for (let i = 0; i < workerSources.length && !workerInitialized; i++) {
        try {
          const workerSrc = workerSources[i]();
          console.log(`[PDFProcessor] Trying worker source ${i + 1}:`, workerSrc);

          // Test if the worker source is accessible
          if (workerSrc.startsWith('http')) {
            const testResponse = await fetch(workerSrc, { method: 'HEAD' });
            if (!testResponse.ok) {
              throw new Error(`Worker source not accessible: ${testResponse.status}`);
            }
          }

          // Set the worker source
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

          // Test the worker with a minimal PDF
          console.log('[PDFProcessor] Testing worker with minimal PDF...');
          const testData = new Uint8Array([
            0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A,
            0x25, 0xC4, 0xE5, 0xF2, 0xE5, 0xEB, 0xA7, 0xF3, 0xA0, 0xD0, 0xC4, 0xC6, 0x0A
          ]);

          const loadingTask = pdfjsLib.getDocument({ 
            data: testData,
            verbosity: 0 
          });

          await Promise.race([
            loadingTask.promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Worker test timeout')), 5000)
            )
          ]);

          console.log(`[PDFProcessor] Worker source ${i + 1} successful!`);
          workerInitialized = true;
          this.workerInitialized = true;

        } catch (error) {
          console.log(`[PDFProcessor] Worker source ${i + 1} failed:`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      if (!workerInitialized) {
        throw new Error(
          `All PDF.js worker sources failed. Last error: ${lastError?.message || 'Unknown error'}. ` +
          'This may be due to network connectivity issues or browser security restrictions. ' +
          'Please try converting your PDF to PNG/JPG format instead.'
        );
      }

    } catch (error) {
      console.error('[PDFProcessor] Worker initialization failed:', error);
      throw new Error(
        'PDF.js worker could not be initialized. ' +
        (error instanceof Error ? error.message : String(error)) +
        ' Please try converting your PDF to PNG/JPG format instead.'
      );
    }
  }

  async processPDF(file: UploadedFile, parameters: ProcessingParameters): Promise<HTMLImageElement> {
    console.log('[PDFProcessor] === PDF PROCESSING START ===');
    console.log('[PDFProcessor] Processing PDF file:', file.file.name);
    
    try {
      // Initialize worker first with better error handling
      await this.initializeWorker();
      
      // Convert file to ArrayBuffer for PDF.js
      const arrayBuffer = await file.file.arrayBuffer();
      console.log('[PDFProcessor] PDF file converted to ArrayBuffer, size:', arrayBuffer.byteLength);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('PDF file appears to be empty');
      }
      
      if (arrayBuffer.byteLength > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('PDF file is too large (>100MB). Please use a smaller file.');
      }
      
      // Load the PDF document with optimized configuration
      console.log('[PDFProcessor] Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0, // Reduce console noise
        useWorkerFetch: false, // Disable worker fetch to avoid network issues
        isEvalSupported: false, // Disable eval for security
        disableFontFace: false, // Keep fonts enabled for better rendering
        useSystemFonts: true, // Use system fonts as fallback
        maxImageSize: 50 * 1024 * 1024, // 50MB max image size
        cMapPacked: true // Use packed CMaps for better performance
      });
      
      // Add timeout to prevent hanging
      const pdfPromise = loadingTask.promise;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout after 20 seconds')), 20000);
      });
      
      const pdf = await Promise.race([pdfPromise, timeoutPromise]);
      console.log(`[PDFProcessor] PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }
      
      // Get the first page
      console.log('[PDFProcessor] Getting first page...');
      const page = await pdf.getPage(1);
      console.log('[PDFProcessor] PDF page loaded successfully');
      
      // Get the viewport for the page - use appropriate scale for quality vs performance
      const scale = Math.min(2.0, Math.max(1.0, 300 / 150)); // Scale based on target DPI
      const viewport = page.getViewport({ scale });
      console.log(`[PDFProcessor] PDF viewport: ${viewport.width}x${viewport.height} at scale ${scale}`);
      
      if (viewport.width === 0 || viewport.height === 0) {
        throw new Error('PDF page has invalid dimensions');
      }
      
      // Check if dimensions are reasonable
      if (viewport.width > 8000 || viewport.height > 8000) {
        throw new Error('PDF page dimensions are too large. Please use a smaller PDF or convert to image.');
      }
      
      // Create a canvas for the PDF page
      const pdfCanvas = document.createElement('canvas');
      const pdfContext = pdfCanvas.getContext('2d', {
        alpha: false, // Disable alpha for better performance
        willReadFrequently: false // We won't read frequently, optimize for rendering
      });
      
      if (!pdfContext) {
        throw new Error('Failed to get PDF canvas context');
      }
      
      pdfCanvas.width = Math.floor(viewport.width);
      pdfCanvas.height = Math.floor(viewport.height);
      console.log(`[PDFProcessor] Canvas dimensions set to: ${pdfCanvas.width}x${pdfCanvas.height}`);
      
      // Set white background for the PDF canvas
      pdfContext.fillStyle = '#FFFFFF';
      pdfContext.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      console.log('[PDFProcessor] Canvas background set to white');
      
      // Render the PDF page to the canvas with timeout
      const renderContext = {
        canvasContext: pdfContext,
        viewport: viewport,
        background: 'white',
        intent: 'display' as const, // Optimize for display
        renderInteractiveForms: false, // Disable forms for faster rendering
        annotationMode: pdfjsLib.AnnotationMode.DISABLE // Disable annotations
      };
      
      console.log('[PDFProcessor] Starting PDF page render...');
      
      // Add timeout to prevent hanging
      const renderPromise = page.render(renderContext).promise;
      const renderTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF render timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([renderPromise, renderTimeoutPromise]);
      console.log('[PDFProcessor] PDF page rendered to canvas successfully');
      
      // Verify canvas has content
      const imageData = pdfContext.getImageData(0, 0, Math.min(pdfCanvas.width, 100), Math.min(pdfCanvas.height, 100));
      const hasContent = this.verifyCanvasContent(imageData);
      console.log('[PDFProcessor] Canvas content verification:', hasContent);
      
      if (!hasContent) {
        throw new Error('PDF rendered to blank canvas - the PDF may be corrupted or empty');
      }
      
      // Convert the PDF canvas to an image
      const img = new Image();
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Image conversion timeout'));
        }, 10000);
        
        img.onload = () => {
          clearTimeout(timeoutId);
          console.log(`[PDFProcessor] PDF converted to image: ${img.width}x${img.height}`);
          console.log('[PDFProcessor] === PDF PROCESSING SUCCESS ===');
          resolve(img);
        };
        
        img.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error('[PDFProcessor] Failed to load PDF as image:', error);
          reject(new Error('Failed to convert PDF to image'));
        };
        
        // Use high quality PNG with reasonable compression
        try {
          const dataUrl = pdfCanvas.toDataURL('image/png', 0.95);
          console.log('[PDFProcessor] Canvas converted to data URL, length:', dataUrl.length);
          
          if (dataUrl.length < 1000) {
            reject(new Error('Generated data URL is too small - PDF may be empty'));
            return;
          }
          
          img.src = dataUrl;
        } catch (canvasError) {
          clearTimeout(timeoutId);
          reject(new Error('Failed to convert canvas to data URL'));
        }
      });
      
    } catch (error) {
      console.error('[PDFProcessor] === PDF PROCESSING ERROR ===');
      console.error('[PDFProcessor] Error processing PDF:', error);
      
      // Provide more detailed error information
      let errorMessage = 'PDF processing failed';
      if (error instanceof Error) {
        if (error.message.includes('worker') || error.message.includes('Worker')) {
          errorMessage = 'PDF.js worker loading failed. Please check your internet connection and try again, or convert your PDF to PNG/JPG.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'PDF processing took too long. The file might be too complex or large. Try a simpler PDF or convert to PNG/JPG.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error during PDF processing. Please check your connection and try again.';
        } else {
          errorMessage = `PDF processing failed: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  private verifyCanvasContent(imageData: ImageData): boolean {
    const { data } = imageData;
    let nonWhitePixels = 0;
    let totalPixels = 0;
    
    // Check if any pixels are significantly different from white
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      totalPixels++;
      
      // If we find any non-white pixel with reasonable alpha
      if (a > 128 && (r < 240 || g < 240 || b < 240)) {
        nonWhitePixels++;
      }
    }
    
    const contentRatio = nonWhitePixels / totalPixels;
    console.log(`[PDFProcessor] Content verification: ${nonWhitePixels}/${totalPixels} pixels (${(contentRatio * 100).toFixed(1)}%)`);
    
    // Need at least 1% non-white pixels to consider it valid content
    return contentRatio > 0.01;
  }
}

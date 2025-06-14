
import { ProcessingParameters, UploadedFile } from "@/types/print";

interface ProcessingResult {
  processedImageUrl: string;
  originalDimensions: { width: number; height: number };
  finalDimensions: { width: number; height: number };
  appliedBleed: number;
}

export class ImageProcessor {
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

  async processFile(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('Starting image processing with parameters:', parameters);
    
    if (file.type === 'pdf') {
      return this.processPDF(file, parameters);
    } else {
      return this.processImage(file, parameters);
    }
  }

  private async processPDF(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    // For PDF, we'll convert first page to image, then process
    console.log('Processing PDF file');
    
    // Create a mock image from PDF for demonstration
    // In a real implementation, you'd use PDF.js to convert PDF to canvas
    const mockImageData = await this.createMockImageFromPDF(file, parameters);
    return this.processImageData(mockImageData, parameters);
  }

  private async processImage(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('Processing image file');
    
    const img = new Image();
    const imageUrl = URL.createObjectURL(file.file);
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          const result = await this.processImageData(img, parameters);
          URL.revokeObjectURL(imageUrl);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  private async processImageData(img: HTMLImageElement, parameters: ProcessingParameters): Promise<ProcessingResult> {
    const originalDimensions = { width: img.width, height: img.height };
    
    // Calculate dimensions with bleed
    const finalWidth = this.mmToPixels(parameters.finalDimensions.width, parameters.dpi);
    const finalHeight = this.mmToPixels(parameters.finalDimensions.height, parameters.dpi);
    const bleedPixels = this.mmToPixels(parameters.bleedMargin, parameters.dpi);
    
    const canvasWidth = finalWidth + (bleedPixels * 2);
    const canvasHeight = finalHeight + (bleedPixels * 2);
    
    // Set up canvas
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    
    // Fill background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Resize and position the main content
    await this.resizeAndPositionContent(img, finalWidth, finalHeight, bleedPixels);
    
    // Extend bleed areas
    await this.extendBleedAreas(bleedPixels, finalWidth, finalHeight);
    
    // Add cut lines
    this.addCutLines(parameters, finalWidth, finalHeight, bleedPixels);
    
    // Convert to blob and create URL
    const processedImageUrl = await this.canvasToDataURL();
    
    return {
      processedImageUrl,
      originalDimensions,
      finalDimensions: { width: canvasWidth, height: canvasHeight },
      appliedBleed: parameters.bleedMargin
    };
  }

  private async resizeAndPositionContent(img: HTMLImageElement, finalWidth: number, finalHeight: number, bleedPixels: number) {
    console.log('Resizing and positioning content');
    
    // Calculate scaling to fit within final dimensions
    const scaleX = finalWidth / img.width;
    const scaleY = finalHeight / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    // Center the content
    const x = bleedPixels + (finalWidth - scaledWidth) / 2;
    const y = bleedPixels + (finalHeight - scaledHeight) / 2;
    
    this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
  }

  private async extendBleedAreas(bleedPixels: number, finalWidth: number, finalHeight: number) {
    console.log('Extending bleed areas by', bleedPixels, 'pixels');
    
    if (bleedPixels === 0) return;
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data, width, height } = imageData;
    
    // Extend top bleed
    for (let y = 0; y < bleedPixels; y++) {
      for (let x = bleedPixels; x < bleedPixels + finalWidth; x++) {
        const sourceY = bleedPixels;
        const sourceIndex = ((sourceY * width) + x) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        data[targetIndex] = data[sourceIndex];         // R
        data[targetIndex + 1] = data[sourceIndex + 1]; // G
        data[targetIndex + 2] = data[sourceIndex + 2]; // B
        data[targetIndex + 3] = data[sourceIndex + 3]; // A
      }
    }
    
    // Extend bottom bleed
    for (let y = bleedPixels + finalHeight; y < height; y++) {
      for (let x = bleedPixels; x < bleedPixels + finalWidth; x++) {
        const sourceY = bleedPixels + finalHeight - 1;
        const sourceIndex = ((sourceY * width) + x) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        data[targetIndex] = data[sourceIndex];
        data[targetIndex + 1] = data[sourceIndex + 1];
        data[targetIndex + 2] = data[sourceIndex + 2];
        data[targetIndex + 3] = data[sourceIndex + 3];
      }
    }
    
    // Extend left bleed
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < bleedPixels; x++) {
        const sourceX = bleedPixels;
        const sourceIndex = ((y * width) + sourceX) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        data[targetIndex] = data[sourceIndex];
        data[targetIndex + 1] = data[sourceIndex + 1];
        data[targetIndex + 2] = data[sourceIndex + 2];
        data[targetIndex + 3] = data[sourceIndex + 3];
      }
    }
    
    // Extend right bleed
    for (let y = 0; y < height; y++) {
      for (let x = bleedPixels + finalWidth; x < width; x++) {
        const sourceX = bleedPixels + finalWidth - 1;
        const sourceIndex = ((y * width) + sourceX) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        data[targetIndex] = data[sourceIndex];
        data[targetIndex + 1] = data[sourceIndex + 1];
        data[targetIndex + 2] = data[sourceIndex + 2];
        data[targetIndex + 3] = data[sourceIndex + 3];
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  private addCutLines(parameters: ProcessingParameters, finalWidth: number, finalHeight: number, bleedPixels: number) {
    console.log('Adding cut lines:', parameters.cutLineType);
    
    this.ctx.strokeStyle = '#FF0000'; // Red cut lines
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]); // Dashed line
    
    const x = bleedPixels;
    const y = bleedPixels;
    
    if (parameters.cutLineType === 'rectangle') {
      // Draw rectangle cut lines
      this.ctx.strokeRect(x, y, finalWidth, finalHeight);
    } else if (parameters.cutLineType === 'circle') {
      // Draw circle cut lines
      const centerX = x + finalWidth / 2;
      const centerY = y + finalHeight / 2;
      const radius = Math.min(finalWidth, finalHeight) / 2;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
    
    // Reset line dash
    this.ctx.setLineDash([]);
  }

  private async createMockImageFromPDF(file: UploadedFile, parameters: ProcessingParameters): Promise<HTMLImageElement> {
    // For demonstration, create a mock image
    // In a real implementation, you'd use PDF.js
    const mockCanvas = document.createElement('canvas');
    const mockCtx = mockCanvas.getContext('2d')!;
    
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    // Create a simple mock content
    mockCtx.fillStyle = '#f0f0f0';
    mockCtx.fillRect(0, 0, 800, 600);
    
    mockCtx.fillStyle = '#333';
    mockCtx.font = '24px Arial';
    mockCtx.textAlign = 'center';
    mockCtx.fillText('PDF Content', 400, 300);
    mockCtx.fillText(`${parameters.finalDimensions.width}×${parameters.finalDimensions.height}mm`, 400, 350);
    
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => resolve(img);
      img.src = mockCanvas.toDataURL();
    });
  }

  private mmToPixels(mm: number, dpi: number): number {
    return Math.round((mm * dpi) / 25.4);
  }

  private async canvasToDataURL(): Promise<string> {
    return this.canvas.toDataURL('image/png', 1.0);
  }

  destroy() {
    // Clean up resources
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

export const createPDFFromProcessedImage = async (
  processedImageUrl: string,
  parameters: ProcessingParameters
): Promise<Blob> => {
  console.log('Creating PDF from processed image');
  
  // Simple PDF creation with the processed image
  // In a real implementation, you might use jsPDF or similar
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${parameters.finalDimensions.width * 2.83} ${parameters.finalDimensions.height * 2.83}]
/Contents 4 0 R
/Resources <<
  /XObject <<
    /Im1 5 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length 58
>>
stream
q
${parameters.finalDimensions.width * 2.83} 0 0 ${parameters.finalDimensions.height * 2.83} 0 0 cm
/Im1 Do
Q
endstream
endobj

5 0 obj
<<
/Type /XObject
/Subtype /Image
/Width ${parameters.finalDimensions.width}
/Height ${parameters.finalDimensions.height}
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Filter /DCTDecode
/Length 1000
>>
stream
Processed Image Data (${parameters.finalDimensions.width}×${parameters.finalDimensions.height}mm)
DPI: ${parameters.dpi}
Bleed: ${parameters.bleedMargin}mm
Cut Line: ${parameters.cutLineType}
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000398 00000 n 
0000000507 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
800
%%EOF`;
  
  return new Blob([pdfContent], { type: 'application/pdf' });
};

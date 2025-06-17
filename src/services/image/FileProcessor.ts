
import { UploadedFile, ProcessingParameters } from "@/types/print";
import { PDFProcessor } from "./PDFProcessor";
import { ImageRenderer } from "./ImageRenderer";

export class FileProcessor {
  private pdfProcessor: PDFProcessor;

  constructor(imageRenderer: ImageRenderer) {
    this.pdfProcessor = new PDFProcessor(imageRenderer);
  }

  async loadImageFile(file: UploadedFile): Promise<HTMLImageElement> {
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

  async processFile(file: UploadedFile, parameters: ProcessingParameters): Promise<HTMLImageElement> {
    console.log('File info:', { name: file.file.name, type: file.type, size: file.file.size });
    
    if (file.type === 'pdf') {
      console.log('Converting PDF to highest quality PNG');
      try {
        const img = await this.pdfProcessor.processPDF(file, parameters);
        console.log('PDF converted successfully to PNG');
        return img;
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
      return this.loadImageFile(file);
    }
  }
}


// Re-export the main classes and functions from the refactored structure
export { ImageProcessor } from "./image/ImageProcessor";
export { createPDFFromProcessedImage } from "./image/PDFExporter";

// Re-export types for backward compatibility
export type { ProcessingResult } from "./image/types";

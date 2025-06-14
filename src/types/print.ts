
export interface UploadedFile {
  file: File;
  type: "pdf" | "image";
  preview?: string;
  pages?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface ProcessingParameters {
  finalDimensions: {
    width: number;
    height: number;
  };
  bleedMargin: number;
  dpi: 150 | 300;
  cutLineType: "rectangle" | "circle";
}

export type ProcessingState = 
  | "idle" 
  | "uploaded" 
  | "validating" 
  | "validated" 
  | "processing" 
  | "completed" 
  | "error";

export interface ValidationIssue {
  type: "warning" | "error";
  message: string;
  category: "dpi" | "bleed" | "content" | "format";
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

export interface PresetTemplate {
  id: string;
  name: string;
  parameters: ProcessingParameters;
  category: "business-cards" | "flyers" | "posters" | "custom";
}

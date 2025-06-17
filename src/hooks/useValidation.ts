
import { useState } from "react";
import { UploadedFile, ProcessingParameters, ValidationResult, ProcessingState } from "@/types/print";
import { useToast } from "@/components/ui/use-toast";
import { AIInpaintingService } from "@/services/image/AIInpaintingService";

export function useValidation() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const { toast } = useToast();

  const handleValidation = async (
    uploadedFile: UploadedFile | null, 
    parameters: ProcessingParameters,
    setProcessingState: (state: ProcessingState) => void,
    setProcessingError: (error: string | null) => void
  ) => {
    if (!uploadedFile) return;
    setProcessingState("validating");
    setProcessingError(null);
    console.log('Starting validation process for new workflow');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const warnings: any[] = [];
      const errors: any[] = [];
      
      // Check file size
      if (uploadedFile.file.size > 100 * 1024 * 1024) {
        errors.push({ type: 'error', message: 'File size exceeds 100MB limit', category: 'format' });
      }
      
      // Check for PDF-specific warnings
      if (uploadedFile.type === 'pdf') {
        warnings.push({
          type: 'warning',
          message: 'PDF will be converted to highest quality PNG for processing.',
          category: 'pdf'
        });
      }
      
      // Check DPI vs final dimensions for high resolution output
      const pixelWidth = (parameters.finalDimensions.width * parameters.dpi) / 25.4;
      const pixelHeight = (parameters.finalDimensions.height * parameters.dpi) / 25.4;
      if (pixelWidth > 5000 || pixelHeight > 5000) {
        warnings.push({
          type: 'warning',
          message: `Very high resolution output (${Math.round(pixelWidth)}×${Math.round(pixelHeight)}px) will take longer to process`,
          category: 'dpi'
        });
      }
      
      // Check bleed margin
      if (parameters.bleedMargin < 2) {
        warnings.push({
          type: 'warning',
          message: 'Bleed margin less than 2mm may cause printing issues',
          category: 'bleed'
        });
      }

      // Check AI configuration
      const aiConfig = AIInpaintingService.getApiConfiguration();
      if (!aiConfig.hasAnyKey) {
        warnings.push({
          type: 'warning',
          message: 'No AI API keys configured. Content extrapolation will use standard methods. Configure HuggingFace API key for AI-powered content generation.',
          category: 'ai'
        });
      } else {
        warnings.push({
          type: 'info',
          message: 'AI-powered content extrapolation will be used to intelligently fill bleed areas.',
          category: 'ai'
        });
      }

      const mockValidation: ValidationResult = {
        isValid: errors.length === 0,
        warnings,
        errors
      };
      
      setValidationResult(mockValidation);
      setProcessingState("validated");
      
      toast({
        title: "Validation Complete",
        description: `Ready for processing. Found ${errors.length} errors and ${warnings.length} notifications.`,
      });
    } catch (error) {
      console.error('Validation error:', error);
      setProcessingError(error instanceof Error ? error.message : String(error));
      toast({
        title: "Validation Failed",
        description: "There was an error during validation. Please try again.",
        variant: "destructive",
      });
      setProcessingState("uploaded");
    }
  };

  return {
    validationResult,
    setValidationResult,
    handleValidation,
  };
}


import { useState, useRef } from "react";
import { ProcessingState, UploadedFile, ProcessingParameters, ValidationResult } from "@/types/print";
import { ImageProcessor, createPDFFromProcessedImage } from "@/services/imageProcessing";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AIInpaintingService } from "@/services/image/AIInpaintingService";

export function useDashboardLogic() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [parameters, setParameters] = useState<ProcessingParameters>({
    finalDimensions: { width: 210, height: 297 }, // A4 default
    bleedMargin: 3,
    dpi: 300,
    cutLineType: "rectangle"
  });
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const [bleedPrompt, setBleedPrompt] = useState<string>("");
  const imageProcessorRef = useRef<ImageProcessor | null>(null);

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    setProcessingState("uploaded");
    setValidationResult(null);
    setOutputUrl(null);
    setProcessedImageUrl(null);
    setProcessingError(null);
    setProcessingProgress(0);
    setBleedPrompt("");
  };

  const handleParameterChange = (newParams: Partial<ProcessingParameters>) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  };

  const handleValidation = async () => {
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

  const handleCancelProcessing = () => {
    if (imageProcessorRef.current) {
      imageProcessorRef.current.cancel("User cancelled");
      imageProcessorRef.current = null;
    }
    setProcessingState("validated");
    setProcessingStep(null);
    setProcessingProgress(0);
    toast({
      title: "Processing Cancelled",
      description: "File processing has been cancelled.",
    });
  };

  const extendedParameters = { ...parameters, bleedPrompt };

  const handleProcessing = async () => {
    if (!uploadedFile || !validationResult) return;
    if (!user) {
      toast({
        title: "Not Signed In",
        description: "You must be signed in to process files.",
        variant: "destructive",
      });
      return;
    }

    setProcessingState("processing");
    setProcessingStep("Initializing new workflow processor");
    setProcessingError(null);
    setProcessingProgress(0);
    console.log('=== NEW WORKFLOW START ===');
    console.log('Starting new workflow with parameters:', extendedParameters);

    let outputFilename = "";
    let outputFileUrl = "";

    try {
      // Step 1: Initialize processor with progress callback
      setProcessingStep("Initializing image processor");
      const processor = new ImageProcessor((step: string, progress?: number) => {
        setProcessingStep(step);
        if (progress !== undefined) {
          setProcessingProgress(progress);
        }
      });
      
      imageProcessorRef.current = processor;

      // Step 2: Process file with new workflow (convert, resize, add bleed, AI extrapolation, cut lines)
      setProcessingStep("Processing with new workflow");
      const result = await processor.processFile(uploadedFile, extendedParameters);
      console.log('New workflow processing result:', result);

      setProcessedImageUrl(result.processedImageUrl);

      // Step 3: Create high-resolution PDF
      setProcessingStep("Creating high-resolution PDF");
      setProcessingProgress(95);
      const pdfBlob = await createPDFFromProcessedImage(result.processedImageUrl, parameters);

      // Step 4: Upload to Supabase
      setProcessingStep("Uploading final PDF");
      setProcessingProgress(97);
      const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const ext = ".pdf";
      outputFilename = `${user.id}/printready_${uniqueId}${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('processed-files')
        .upload(outputFilename, pdfBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: "application/pdf"
        });

      if (uploadError) {
        setProcessingStep("Upload failed");
        throw new Error("Failed to upload file to storage: " + uploadError.message);
      }

      // Step 5: Get public URL
      setProcessingStep("Generating download link");
      setProcessingProgress(99);
      const { data: fileUrlData, error: urlError } = await supabase
        .storage
        .from('processed-files')
        .createSignedUrl(outputFilename, 60 * 60);

      if (urlError || !fileUrlData?.signedUrl) {
        setProcessingStep("Link generation failed");
        throw new Error("Failed to get signed URL: " + (urlError?.message ?? "unknown error"));
      }

      outputFileUrl = fileUrlData.signedUrl;
      setOutputUrl(outputFileUrl);

      // Step 6: Log to database
      setProcessingStep("Saving metadata");
      const { error: dbError } = await supabase
        .from("processed_files")
        .insert({
          user_id: user.id,
          original_filename: uploadedFile.file.name,
          output_filename: outputFilename,
          format: "PDF",
          dpi: parameters.dpi,
          width_mm: parameters.finalDimensions.width,
          height_mm: parameters.finalDimensions.height,
          bleed_mm: parameters.bleedMargin,
          cut_line_type: parameters.cutLineType,
          file_url: outputFileUrl,
          processing_status: "completed",
        });

      if (dbError) {
        console.warn("Database logging failed:", dbError);
      }

      // Step 7: Cleanup and success
      setProcessingStep("Finalizing");
      setProcessingProgress(100);
      processor.destroy();
      imageProcessorRef.current = null;

      setProcessingState("completed");
      setProcessingStep(null);

      toast({
        title: "New Workflow Complete!",
        description: "Your file has been processed with AI content extrapolation and exported as a high-resolution PDF.",
      });

    } catch (error: any) {
      console.error('New workflow processing error:', error);
      setProcessingError(error?.message || String(error));
      
      if (error?.message?.includes('cancelled')) {
        return;
      }
      
      let errorTitle = "Processing Failed";
      let errorDescription = error?.message || String(error);
      
      if (error?.message?.includes('PDF')) {
        errorTitle = "PDF Conversion Failed";
        errorDescription = error.message + " Please try a different PDF or convert to PNG/JPG.";
      } else if (error?.message?.includes('AI') || error?.message?.includes('extrapolation')) {
        errorTitle = "AI Processing Failed";
        errorDescription = "AI content extrapolation failed. " + error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });

      // Log failed processing
      if (user && uploadedFile) {
        await supabase
          .from("processed_files")
          .insert({
            user_id: user.id,
            original_filename: uploadedFile.file.name,
            output_filename: outputFilename || "N/A",
            format: "PDF",
            dpi: parameters.dpi,
            width_mm: parameters.finalDimensions.width,
            height_mm: parameters.finalDimensions.height,
            bleed_mm: parameters.bleedMargin,
            cut_line_type: parameters.cutLineType,
            file_url: outputFileUrl || "",
            processing_status: "error",
            error_message: (processingStep ? `${processingStep}: ` : "") + (error?.message || String(error)),
          });
      }

      // Cleanup processor on error
      if (imageProcessorRef.current) {
        imageProcessorRef.current.destroy();
        imageProcessorRef.current = null;
      }

      setProcessingState("validated");
    }
  };

  return {
    uploadedFile,
    setUploadedFile,
    processingState,
    setProcessingState,
    parameters,
    setParameters,
    validationResult,
    setValidationResult,
    outputUrl,
    setOutputUrl,
    processedImageUrl,
    setProcessedImageUrl,
    processingStep,
    setProcessingStep,
    processingError,
    setProcessingError,
    processingProgress,
    setProcessingProgress,
    bleedPrompt,
    setBleedPrompt,
    handleFileUpload,
    handleParameterChange,
    handleValidation,
    handleProcessing,
    handleCancelProcessing,
  };
}

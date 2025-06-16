
import { useState } from "react";
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [bleedPrompt, setBleedPrompt] = useState<string>("");

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    setProcessingState("uploaded");
    setValidationResult(null);
    setOutputUrl(null);
    setProcessedImageUrl(null);
    setProcessingError(null);
    setBleedPrompt(""); // Reset any previous prompt on new upload
  };

  const handleParameterChange = (newParams: Partial<ProcessingParameters>) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  };

  const handleValidation = async () => {
    if (!uploadedFile) return;
    setProcessingState("validating");
    setProcessingError(null);
    console.log('Starting validation process');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const warnings: any[] = [];
      const errors: any[] = [];
      
      // Check file size
      if (uploadedFile.file.size > 50 * 1024 * 1024) {
        errors.push({ type: 'error', message: 'File size exceeds 50MB limit', category: 'format' });
      }
      
      // Check for PDF-specific warnings
      if (uploadedFile.type === 'pdf') {
        warnings.push({
          type: 'warning',
          message: 'PDF processing requires stable internet connection. If processing fails, try converting to PNG/JPG.',
          category: 'pdf'
        });
      }
      
      // Check DPI vs final dimensions
      const pixelWidth = (parameters.finalDimensions.width * parameters.dpi) / 25.4;
      const pixelHeight = (parameters.finalDimensions.height * parameters.dpi) / 25.4;
      if (pixelWidth > 4000 || pixelHeight > 4000) {
        warnings.push({
          type: 'warning',
          message: `High resolution output (${Math.round(pixelWidth)}×${Math.round(pixelHeight)}px) may take longer to process`,
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

      // Check AI configuration and add informational warnings
      const aiConfig = AIInpaintingService.getApiConfiguration();
      if (!aiConfig.hasAnyKey) {
        warnings.push({
          type: 'warning',
          message: 'No AI API keys configured. Bleed areas will be filled using standard methods. Configure API keys for enhanced AI-powered bleed generation.',
          category: 'ai'
        });
      } else if (aiConfig.hasOpenAI && !aiConfig.hasHuggingFace) {
        warnings.push({
          type: 'info',
          message: 'Only OpenAI API key configured. HuggingFace API key recommended as fallback.',
          category: 'ai'
        });
      } else if (!aiConfig.hasOpenAI && aiConfig.hasHuggingFace) {
        warnings.push({
          type: 'info',
          message: 'Only HuggingFace API key configured. OpenAI API key recommended for best results.',
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
        description: `Found ${errors.length} errors and ${warnings.length} warnings`,
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
    setProcessingStep("Initializing processor");
    setProcessingError(null);
    console.log('Starting processing with parameters:', extendedParameters);

    let outputFilename = "";
    let outputFileUrl = "";

    try {
      // Step 1: Check AI configuration and notify user
      const aiConfig = AIInpaintingService.getApiConfiguration();
      if (aiConfig.hasAnyKey) {
        toast({
          title: "Processing Started",
          description: "Your file is being processed with AI-powered bleed generation...",
        });
      } else {
        toast({
          title: "Processing Started",
          description: "Your file is being processed with standard bleed methods. Configure API keys for AI enhancement.",
        });
      }

      // Step 2: Initialize processor with progress callback
      setProcessingStep("Initializing image processor");
      const processor = new ImageProcessor((step: string) => {
        setProcessingStep(step);
      });

      // Step 3: Process file with progress updates
      setProcessingStep("Processing file (bleed, cut lines, AI)");
      const result = await processor.processFile(uploadedFile, extendedParameters);
      console.log('Processing result:', result);

      setProcessedImageUrl(result.processedImageUrl);

      // Step 4: Create PDF
      setProcessingStep("Creating PDF from processed image");
      const pdfBlob = await createPDFFromProcessedImage(result.processedImageUrl, parameters);

      // Step 5: Upload to Supabase
      setProcessingStep("Uploading PDF to storage");
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

      // Step 6: Get public URL
      setProcessingStep("Generating download link");
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

      // Step 7: Log to database
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
        // Don't fail the entire process for logging issues
      }

      // Step 8: Cleanup and success
      setProcessingStep("Cleaning up resources");
      processor.destroy();

      setProcessingState("completed");
      setProcessingStep(null);

      const successMessage = aiConfig.hasAnyKey 
        ? `File processed successfully with AI-enhanced bleed generation!`
        : `File processed successfully with standard bleed methods!`;

      toast({
        title: "Processing Complete!",
        description: successMessage,
      });

    } catch (error: any) {
      console.error('Processing error:', error);
      setProcessingError(error?.message || String(error));
      
      // Provide helpful error context
      let errorTitle = "Processing Failed";
      let errorDescription = error?.message || String(error);
      
      if (error?.message?.includes('PDF')) {
        errorTitle = "PDF Processing Failed";
        errorDescription = error.message + " Consider converting your PDF to PNG or JPG format.";
      } else if (error?.message?.includes('AI') || error?.message?.includes('inpainting')) {
        errorTitle = "AI Processing Failed";
        errorDescription = "AI processing failed, but you can still process with standard methods. " + error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });

      // Log failed processing to database
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
    bleedPrompt,
    setBleedPrompt,
    handleFileUpload,
    handleParameterChange,
    handleValidation,
    handleProcessing,
  };
}

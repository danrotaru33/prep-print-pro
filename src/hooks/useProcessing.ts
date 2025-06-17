
import { useState, useRef } from "react";
import { UploadedFile, ProcessingParameters, ProcessingState } from "@/types/print";
import { ImageProcessor, createPDFFromProcessedImage } from "@/services/imageProcessing";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProcessing() {
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const imageProcessorRef = useRef<ImageProcessor | null>(null);

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

  const handleProcessing = async (
    uploadedFile: UploadedFile | null,
    parameters: ProcessingParameters,
    bleedPrompt: string
  ) => {
    if (!uploadedFile) return;
    if (!user) {
      toast({
        title: "Not Signed In",
        description: "You must be signed in to process files.",
        variant: "destructive",
      });
      return;
    }

    const extendedParameters = { ...parameters, bleedPrompt };

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
    processingState,
    setProcessingState,
    processedImageUrl,
    setProcessedImageUrl,
    processingStep,
    setProcessingStep,
    processingError,
    setProcessingError,
    processingProgress,
    setProcessingProgress,
    outputUrl,
    setOutputUrl,
    handleProcessing,
    handleCancelProcessing,
  };
}

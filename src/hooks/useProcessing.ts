
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
    console.log('[useProcessing] Cancel requested');
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
    console.log('[useProcessing] Starting processing with parameters:', parameters);
    
    if (!uploadedFile) {
      console.error('[useProcessing] No uploaded file provided');
      return;
    }
    
    if (!user) {
      console.error('[useProcessing] No user authenticated');
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
    console.log('[useProcessing] Starting new workflow with parameters:', extendedParameters);

    let outputFilename = "";
    let outputFileUrl = "";

    try {
      // Step 1: Initialize processor with progress callback
      console.log('[useProcessing] Step 1: Initialize processor');
      setProcessingStep("Initializing image processor");
      setProcessingProgress(5);
      
      const processor = new ImageProcessor((step: string, progress?: number) => {
        console.log(`[useProcessing] Progress callback: ${step}, progress: ${progress}`);
        setProcessingStep(step);
        if (progress !== undefined) {
          setProcessingProgress(progress);
        }
      });
      
      imageProcessorRef.current = processor;
      console.log('[useProcessing] Processor initialized successfully');

      // Step 2: Process file with new workflow
      console.log('[useProcessing] Step 2: Starting file processing');
      setProcessingStep("Processing with new workflow");
      setProcessingProgress(10);
      
      const result = await Promise.race([
        processor.processFile(uploadedFile, extendedParameters),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout after 60 seconds')), 60000)
        )
      ]);
      
      console.log('[useProcessing] File processing completed:', result);
      setProcessedImageUrl(result.processedImageUrl);
      setProcessingProgress(85);

      // Step 3: Create high-resolution PDF
      console.log('[useProcessing] Step 3: Creating PDF');
      setProcessingStep("Creating high-resolution PDF");
      setProcessingProgress(88);
      
      const pdfBlob = await Promise.race([
        createPDFFromProcessedImage(result.processedImageUrl, parameters),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF creation timeout after 30 seconds')), 30000)
        )
      ]);
      
      console.log('[useProcessing] PDF created successfully, size:', pdfBlob.size);

      // Step 4: Upload to Supabase
      console.log('[useProcessing] Step 4: Uploading to Supabase');
      setProcessingStep("Uploading final PDF");
      setProcessingProgress(92);
      
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
        console.error('[useProcessing] Upload error:', uploadError);
        throw new Error("Failed to upload file to storage: " + uploadError.message);
      }
      console.log('[useProcessing] File uploaded successfully:', uploadData);

      // Step 5: Get public URL
      console.log('[useProcessing] Step 5: Getting signed URL');
      setProcessingStep("Generating download link");
      setProcessingProgress(96);
      
      const { data: fileUrlData, error: urlError } = await supabase
        .storage
        .from('processed-files')
        .createSignedUrl(outputFilename, 60 * 60);

      if (urlError || !fileUrlData?.signedUrl) {
        console.error('[useProcessing] URL error:', urlError);
        throw new Error("Failed to get signed URL: " + (urlError?.message ?? "unknown error"));
      }

      outputFileUrl = fileUrlData.signedUrl;
      setOutputUrl(outputFileUrl);
      console.log('[useProcessing] Signed URL generated successfully');

      // Step 6: Log to database
      console.log('[useProcessing] Step 6: Logging to database');
      setProcessingStep("Saving metadata");
      setProcessingProgress(98);
      
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
        console.warn('[useProcessing] Database logging failed:', dbError);
      } else {
        console.log('[useProcessing] Database logging successful');
      }

      // Step 7: Cleanup and success
      console.log('[useProcessing] Step 7: Finalizing');
      setProcessingStep("Finalizing");
      setProcessingProgress(100);
      
      processor.destroy();
      imageProcessorRef.current = null;

      setProcessingState("completed");
      setProcessingStep(null);
      console.log('[useProcessing] Processing completed successfully');

      toast({
        title: "New Workflow Complete!",
        description: "Your file has been processed with AI content extrapolation and exported as a high-resolution PDF.",
      });

    } catch (error: any) {
      console.error('[useProcessing] Processing error:', error);
      setProcessingError(error?.message || String(error));
      
      if (error?.message?.includes('cancelled')) {
        console.log('[useProcessing] Processing was cancelled');
        return;
      }
      
      let errorTitle = "Processing Failed";
      let errorDescription = error?.message || String(error);
      
      if (error?.message?.includes('timeout')) {
        errorTitle = "Processing Timeout";
        errorDescription = "Processing took too long and was cancelled. Please try again with a smaller file or different settings.";
      } else if (error?.message?.includes('PDF')) {
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
        try {
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
        } catch (dbError) {
          console.error('[useProcessing] Failed to log error to database:', dbError);
        }
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

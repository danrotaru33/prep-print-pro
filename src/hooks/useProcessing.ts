
import { useState, useRef } from "react";
import { UploadedFile, ProcessingParameters, ProcessingState } from "@/types/print";
import { ImageProcessor, createPDFFromProcessedImage } from "@/services/imageProcessing";
import { useToast } from "@/components/ui/use-toast";
import { ProcessingResult } from "@/services/image/types";

export function useProcessing() {
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const { toast } = useToast();
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

    const extendedParameters = { ...parameters, bleedPrompt };

    setProcessingState("processing");
    setProcessingStep("Initializing processor");
    setProcessingError(null);
    setProcessingProgress(0);
    console.log('=== PROCESSING START ===');
    console.log('[useProcessing] Starting processing with parameters:', extendedParameters);

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

      // Step 2: Process file
      console.log('[useProcessing] Step 2: Starting file processing');
      setProcessingStep("Processing image");
      setProcessingProgress(10);
      
      const result = await Promise.race([
        processor.processFile(uploadedFile, extendedParameters),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout after 60 seconds')), 60000)
        )
      ]) as ProcessingResult;
      
      console.log('[useProcessing] File processing completed:', result);
      setProcessedImageUrl(result.processedImageUrl);
      setProcessingProgress(70);

      // Step 3: Create PDF for download
      console.log('[useProcessing] Step 3: Creating PDF');
      setProcessingStep("Creating PDF for download");
      setProcessingProgress(80);
      
      const pdfBlob = await Promise.race([
        createPDFFromProcessedImage(result.processedImageUrl, parameters),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('PDF creation timeout after 30 seconds')), 30000)
        )
      ]) as Blob;
      
      console.log('[useProcessing] PDF created successfully, size:', pdfBlob.size);

      // Step 4: Create download URL
      setProcessingStep("Preparing download");
      setProcessingProgress(95);
      
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setOutputUrl(pdfUrl);
      
      // Step 5: Cleanup and success
      setProcessingStep("Finalizing");
      setProcessingProgress(100);
      
      processor.destroy();
      imageProcessorRef.current = null;

      setProcessingState("completed");
      setProcessingStep(null);
      console.log('[useProcessing] Processing completed successfully');

      toast({
        title: "Processing Complete!",
        description: "Your file has been processed and is ready for download.",
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

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingPanel } from "@/components/ProcessingPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ProcessingState, UploadedFile, ProcessingParameters, ValidationResult } from "@/types/print";
import { ImageProcessor, createPDFFromProcessedImage } from "@/services/imageProcessing";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
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
    setBleedPrompt(""); // Reset any previous prompt on new upload
  };

  const handleParameterChange = (newParams: Partial<ProcessingParameters>) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  };

  const handleValidation = async () => {
    if (!uploadedFile) return;
    setProcessingState("validating");
    console.log('Starting validation process');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const warnings: any[] = [];
      const errors: any[] = [];
      // Check file size
      if (uploadedFile.file.size > 50 * 1024 * 1024) {
        errors.push({ type: 'error', message: 'File size exceeds 50MB limit', category: 'format' });
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
      // Step 1: Init
      setProcessingStep("Initializing image processor");
      const processor = new ImageProcessor();

      toast({
        title: "Processing Started",
        description: "Your file is being processed with AI optimization...",
      });

      // Step 2: Process file (update to use extendedParameters)
      setProcessingStep("Processing file (bleed, cut lines, AI)");
      const result = await processor.processFile(uploadedFile, extendedParameters);
      console.log('Processing result:', result);

      setProcessedImageUrl(result.processedImageUrl);

      // Step 3: Create PDF
      setProcessingStep("Creating PDF from processed image");
      const pdfBlob = await createPDFFromProcessedImage(result.processedImageUrl, parameters);

      // Step 4: Upload to Supabase - include user ID in path for RLS compliance
      setProcessingStep("Uploading PDF to Supabase Storage");
      const uniqueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const ext = ".pdf";
      // Include user ID in the file path for RLS compliance
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
        setProcessingStep("Uploading PDF to Supabase failed");
        throw new Error("Failed to upload file to storage: " + uploadError.message);
      }

      // Step 5: Get public URL
      setProcessingStep("Getting signed URL from Supabase");
      const { data: fileUrlData, error: urlError } = await supabase
        .storage
        .from('processed-files')
        .createSignedUrl(outputFilename, 60 * 60);

      if (urlError || !fileUrlData?.signedUrl) {
        setProcessingStep("Generating signed URL failed");
        throw new Error("Failed to get signed URL: " + (urlError?.message ?? "unknown error"));
      }

      outputFileUrl = fileUrlData.signedUrl;
      setOutputUrl(outputFileUrl);

      // Step 6: Log to DB
      setProcessingStep("Logging metadata to database");
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
        setProcessingStep("Logging metadata to database failed");
        toast({
          title: "Warning: Metadata Logging Failed",
          description: "File was processed, but metadata was not saved to dashboard.",
          variant: "destructive",
        });
      }

      // Step 7: Cleanup
      setProcessingStep("Cleaning up resources");
      processor.destroy();

      setProcessingState("completed");
      setProcessingStep(null);

      toast({
        title: "Processing Complete!",
        description: `File processed and saved with ${parameters.bleedMargin}mm bleed and ${parameters.cutLineType} cut lines`,
      });

    } catch (error: any) {
      console.error('Processing error:', error);
      setProcessingError(error?.message || String(error));
      toast({
        title: `Processing Failed - Step: ${processingStep}`,
        description: error?.message || String(error),
        variant: "destructive",
      });

      // Attempt to log failed processing event in DB
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

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      <Sidebar 
        parameters={parameters}
        onParameterChange={handleParameterChange}
        processingState={processingState}
      />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FileUpload 
              onFileUpload={handleFileUpload}
              uploadedFile={uploadedFile}
              processingState={processingState}
            />
            {uploadedFile && (
              <ProcessingPanel
                file={uploadedFile}
                parameters={parameters}
                processingState={processingState}
                onValidate={handleValidation}
                onProcess={handleProcessing}
                bleedPrompt={bleedPrompt}
                onBleedPromptChange={setBleedPrompt}
              />
            )}
            {validationResult && (
              <ValidationPanel
                validationResult={validationResult}
                onApprove={handleProcessing}
              />
            )}
          </div>
          <div>
            <OutputPanel
              processingState={processingState}
              outputUrl={outputUrl}
              parameters={parameters}
              processedImageUrl={processedImageUrl}
              processingStep={processingStep}
              processingError={processingError}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

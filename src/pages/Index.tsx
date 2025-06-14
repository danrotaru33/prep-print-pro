
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
  const { toast } = useToast();

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    setProcessingState("uploaded");
    setValidationResult(null);
    setOutputUrl(null);
    setProcessedImageUrl(null);
  };

  const handleParameterChange = (newParams: Partial<ProcessingParameters>) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  };

  const handleValidation = async () => {
    if (!uploadedFile) return;
    
    setProcessingState("validating");
    console.log('Starting validation process');
    
    try {
      // Simulate validation process with real checks
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const warnings: any[] = [];
      const errors: any[] = [];
      
      // Check file size
      if (uploadedFile.file.size > 50 * 1024 * 1024) { // 50MB
        errors.push({
          type: 'error',
          message: 'File size exceeds 50MB limit',
          category: 'format'
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

  const handleProcessing = async () => {
    if (!uploadedFile || !validationResult) return;
    
    setProcessingState("processing");
    console.log('Starting processing with parameters:', parameters);
    
    try {
      // Initialize image processor
      const processor = new ImageProcessor();
      
      toast({
        title: "Processing Started",
        description: "Your file is being processed with AI optimization...",
      });
      
      // Process the image with bleed extension, cut lines, and AI optimization
      const result = await processor.processFile(uploadedFile, parameters);
      console.log('Processing result:', result);
      
      setProcessedImageUrl(result.processedImageUrl);
      
      // Create final PDF
      const pdfBlob = await createPDFFromProcessedImage(result.processedImageUrl, parameters);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setOutputUrl(pdfUrl);
      setProcessingState("completed");
      
      // Clean up processor
      processor.destroy();
      
      toast({
        title: "Processing Complete!",
        description: `File processed with ${parameters.bleedMargin}mm bleed and ${parameters.cutLineType} cut lines`,
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
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
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

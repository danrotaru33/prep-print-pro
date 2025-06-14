
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingPanel } from "@/components/ProcessingPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ProcessingState, UploadedFile, ProcessingParameters, ValidationResult } from "@/types/print";

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

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    setProcessingState("uploaded");
    setValidationResult(null);
    setOutputUrl(null);
  };

  const handleParameterChange = (newParams: Partial<ProcessingParameters>) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  };

  const handleValidation = async () => {
    if (!uploadedFile) return;
    
    setProcessingState("validating");
    // Simulate validation process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockValidation: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: []
    };
    
    setValidationResult(mockValidation);
    setProcessingState("validated");
  };

  const handleProcessing = async () => {
    if (!uploadedFile || !validationResult) return;
    
    setProcessingState("processing");
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock output URL
    setOutputUrl("blob:processed-file.pdf");
    setProcessingState("completed");
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
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

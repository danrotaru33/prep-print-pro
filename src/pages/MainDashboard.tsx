
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingPanel } from "@/components/ProcessingPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { useDashboardLogic } from "@/hooks/useDashboardLogic";

/**
 * MainDashboard: Responsible for layout and rendering dashboard components.
 * Logic and all state management lives in useDashboardLogic hook.
 */
const MainDashboard = () => {
  const {
    uploadedFile,
    processingState,
    parameters,
    validationResult,
    outputUrl,
    processedImageUrl,
    processingStep,
    processingError,
    processingProgress,
    bleedPrompt,
    useAIOutpaint,
    setUseAIOutpaint,
    handleFileUpload,
    handleParameterChange,
    handleValidation,
    handleProcessing,
    handleCancelProcessing,
    setBleedPrompt,
  } = useDashboardLogic();

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
            
            <ApiKeySettings />
            
            {uploadedFile && (
              <ProcessingPanel
                file={uploadedFile}
                parameters={parameters}
                processingState={processingState}
                onValidate={handleValidation}
                onProcess={handleProcessing}
                onCancel={handleCancelProcessing}
                bleedPrompt={bleedPrompt}
                onBleedPromptChange={setBleedPrompt}
                useAIOutpaint={useAIOutpaint}
                onUseAIOutpaintChange={setUseAIOutpaint}
                processingProgress={processingProgress}
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

export default MainDashboard;


import { UploadedFile } from "@/types/print";
import { useFileUpload } from "./useFileUpload";
import { useValidation } from "./useValidation";
import { useProcessing } from "./useProcessing";
import { useParameters } from "./useParameters";

export function useDashboardLogic() {
  const {
    uploadedFile,
    setUploadedFile,
    handleFileUpload,
  } = useFileUpload();

  const {
    parameters,
    setParameters,
    bleedPrompt,
    setBleedPrompt,
    useAIOutpaint,
    setUseAIOutpaint,
    handleParameterChange,
  } = useParameters();

  const {
    validationResult,
    setValidationResult,
    handleValidation,
  } = useValidation();

  const {
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
  } = useProcessing();

  // Enhanced file upload handler that resets state
  const enhancedHandleFileUpload = (file: UploadedFile) => {
    handleFileUpload(file);
    setProcessingState("uploaded");
    setValidationResult(null);
    setOutputUrl(null);
    setProcessedImageUrl(null);
    setProcessingError(null);
    setProcessingProgress(0);
    setBleedPrompt("");
  };

  // Enhanced validation handler that passes required dependencies
  const enhancedHandleValidation = async () => {
    await handleValidation(uploadedFile, parameters, setProcessingState, setProcessingError);
  };

  // Enhanced processing handler that passes required dependencies
  const enhancedHandleProcessing = async () => {
    await handleProcessing(uploadedFile, parameters, bleedPrompt, useAIOutpaint);
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
    useAIOutpaint,
    setUseAIOutpaint,
    handleFileUpload: enhancedHandleFileUpload,
    handleParameterChange,
    handleValidation: enhancedHandleValidation,
    handleProcessing: enhancedHandleProcessing,
    handleCancelProcessing,
  };
}

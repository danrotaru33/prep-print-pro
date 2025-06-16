
import { Play, CheckCircle, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UploadedFile, ProcessingParameters, ProcessingState } from "@/types/print";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface ProcessingPanelProps {
  file: UploadedFile;
  parameters: ProcessingParameters;
  processingState: ProcessingState;
  onValidate: () => void;
  onProcess: () => void;
  onCancel?: () => void;
  bleedPrompt?: string;
  onBleedPromptChange?: (prompt: string) => void;
  processingProgress?: number;
}

export const ProcessingPanel = ({
  file,
  parameters,
  processingState,
  onValidate,
  onProcess,
  onCancel,
  bleedPrompt,
  onBleedPromptChange,
  processingProgress = 0,
}: ProcessingPanelProps) => {
  const canValidate = processingState === "uploaded";
  const canProcess = processingState === "validated";
  const isProcessing =
    processingState === "processing" || processingState === "validating";

  const [localBleedPrompt, setLocalBleedPrompt] = useState(bleedPrompt || "");

  useEffect(() => {
    setLocalBleedPrompt(bleedPrompt || "");
  }, [bleedPrompt]);

  const handlePromptBlur = () => {
    if (onBleedPromptChange) {
      onBleedPromptChange(localBleedPrompt);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Play className="h-5 w-5" />
          <span>New Workflow Processing</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Target Specifications:</span>
            <Badge variant="outline">
              {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm @ {parameters.dpi}DPI
            </Badge>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Bleed: {parameters.bleedMargin}mm</p>
            <p>Cut line: {parameters.cutLineType}</p>
            <p className="text-blue-600 font-medium">Workflow: Convert → Resize → AI Extrapolation → Cut Lines → PDF Export</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="content-prompt">
            AI Content Extrapolation Prompt <span className="text-gray-400">(optional)</span>
          </label>
          <Textarea
            id="content-prompt"
            placeholder="Describe what content should fill the bleed areas. E.g. 'extend the background seamlessly', 'continue the pattern', 'natural sky continuation'..."
            value={localBleedPrompt}
            disabled={isProcessing}
            onChange={(e) => setLocalBleedPrompt(e.target.value)}
            onBlur={handlePromptBlur}
            className="min-h-[48px] text-xs"
            maxLength={400}
          />
          <p className="text-[11px] text-gray-400 italic">
            AI will use this prompt to intelligently extrapolate content for bleed areas using HuggingFace models.
          </p>
        </div>

        {isProcessing && processingState === "processing" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Workflow Progress</span>
              <span className="text-xs text-gray-500">{processingProgress.toFixed(0)}%</span>
            </div>
            <Progress value={processingProgress} className="w-full" />
          </div>
        )}
        
        <div className="space-y-2">
          <Button
            onClick={onValidate}
            disabled={!canValidate || isProcessing}
            className="w-full"
            variant={processingState === "validated" ? "outline" : "default"}
          >
            {processingState === "validating" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Validating for New Workflow...
              </>
            ) : processingState === "validated" ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Ready for Processing
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Validate File
              </>
            )}
          </Button>
          
          <div className="flex gap-2">
            <Button
              onClick={onProcess}
              disabled={!canProcess || isProcessing}
              className="flex-1"
              variant="default"
            >
              {processingState === "processing" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing New Workflow...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start New Workflow
                </>
              )}
            </Button>
            
            {isProcessing && onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Cancel processing"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


import { Play, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadedFile, ProcessingParameters, ProcessingState } from "@/types/print";

interface ProcessingPanelProps {
  file: UploadedFile;
  parameters: ProcessingParameters;
  processingState: ProcessingState;
  onValidate: () => void;
  onProcess: () => void;
}

export const ProcessingPanel = ({ 
  file, 
  parameters, 
  processingState, 
  onValidate, 
  onProcess 
}: ProcessingPanelProps) => {
  const canValidate = processingState === "uploaded";
  const canProcess = processingState === "validated";
  const isProcessing = processingState === "processing" || processingState === "validating";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Play className="h-5 w-5" />
          <span>Processing Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Parameters:</span>
            <Badge variant="outline">
              {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm
            </Badge>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Bleed: {parameters.bleedMargin}mm</p>
            <p>DPI: {parameters.dpi}</p>
            <p>Cut line: {parameters.cutLineType}</p>
          </div>
        </div>

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
                Validating...
              </>
            ) : processingState === "validated" ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Validation Complete
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Validate File
              </>
            )}
          </Button>

          <Button
            onClick={onProcess}
            disabled={!canProcess || isProcessing}
            className="w-full"
            variant="default"
          >
            {processingState === "processing" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Process File
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

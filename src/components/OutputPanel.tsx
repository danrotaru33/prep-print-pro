
import { Download, Eye, FileText, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProcessingState, ProcessingParameters } from "@/types/print";

interface OutputPanelProps {
  processingState: ProcessingState;
  outputUrl: string | null;
  parameters: ProcessingParameters;
}

export const OutputPanel = ({ processingState, outputUrl, parameters }: OutputPanelProps) => {
  const isCompleted = processingState === "completed" && outputUrl;
  const isProcessing = processingState === "processing";

  const handleDownload = () => {
    if (outputUrl) {
      const link = document.createElement('a');
      link.href = outputUrl;
      link.download = 'processed-file.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = () => {
    if (outputUrl) {
      window.open(outputUrl, '_blank');
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Output</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {processingState === "idle" && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Upload a file to get started</p>
          </div>
        )}

        {(processingState === "uploaded" || processingState === "validating" || processingState === "validated") && (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Waiting for processing...</p>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="font-medium text-blue-700">Processing your file...</p>
            <p className="text-sm text-gray-500 mt-2">
              Applying {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm dimensions
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p className="font-medium text-green-700">Processing Complete!</p>
              <p className="text-sm text-gray-500">Your file is ready for download</p>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Format:</span> PDF</p>
                <p><span className="font-medium">Dimensions:</span> {parameters.finalDimensions.width}×{parameters.finalDimensions.height}mm</p>
                <p><span className="font-medium">DPI:</span> {parameters.dpi}</p>
                <p><span className="font-medium">Bleed:</span> {parameters.bleedMargin}mm</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handlePreview} variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
